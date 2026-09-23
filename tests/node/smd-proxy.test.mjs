import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import handler from '../../api/smd/[...path].js';

const intendedApiEntrypoints = [
  '_downloadDashProxy.js',
  'smd/[...path].js',
  'smd/facebook/download.js',
  'smd/health.js',
  'smd/instagram/download.js',
  'smd/pinterest/download.js',
  'smd/rapid-youtube-file.js',
  'smd/rapid-youtube.js',
  'smd/reddit/download.js',
  'smd/tiktok/download.js',
  'smd/twitter/download.js',
  'smd/x/download.js',
  'smd/youtube/download.js',
];

const listJsFiles = async (rootUrl, prefix = '') => {
  const entries = await readdir(rootUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listJsFiles(new URL(`${entry.name}/`, rootUrl), relativePath));
    } else if (entry.name.endsWith('.js')) {
      files.push(relativePath);
    }
  }

  return files.sort();
};

const createResponse = () => {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
};

const readJson = (res) => JSON.parse(String(res.body || '{}'));

const withProxyEnv = async (callback, overrides = {}) => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = overrides.baseUrl ?? 'https://render.example';
  if (overrides.apiKey === null) {
    delete process.env.DOWNLOADDASH_API_KEY;
  } else {
    process.env.DOWNLOADDASH_API_KEY = overrides.apiKey ?? 'test-key';
  }

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    if (originalKey === undefined) {
      delete process.env.DOWNLOADDASH_API_KEY;
    } else {
      process.env.DOWNLOADDASH_API_KEY = originalKey;
    }
  }
};

const request = async ({ path, body, method = 'POST', headers = {}, query = {} }) => {
  const res = createResponse();
  await handler(
    {
      method,
      url: `/api/smd/${path}`,
      query,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers,
      },
      body,
      socket: { remoteAddress: '198.51.100.10' },
    },
    res
  );
  return res;
};

const validUrls = {
  tiktok: 'https://www.tiktok.com/@creator/video/123',
  instagram: 'https://www.instagram.com/reel/ABC123/',
  facebook: 'https://www.facebook.com/watch/?v=123',
  pinterest: 'https://www.pinterest.com/pin/123/',
  youtube: 'https://www.youtube.com/watch?v=abc123',
  reddit: 'https://www.reddit.com/r/test/comments/abc/title/',
  x: 'https://x.com/user/status/123',
  twitter: 'https://twitter.com/user/status/123',
};

const upstreamSuccess = {
  success: true,
  media_info: {
    title: 'Example media',
    author_username: 'creator',
    thumbnail_url: 'https://cdn.example/thumb.jpg',
  },
  downloads: {
    videoHD: 'https://cdn.example/video.mp4',
  },
};

const wrongDomainUrl = {
  tiktok: validUrls.instagram,
  instagram: validUrls.tiktok,
  facebook: validUrls.youtube,
  pinterest: validUrls.reddit,
  youtube: validUrls.tiktok,
  reddit: validUrls.facebook,
  x: validUrls.youtube,
  twitter: validUrls.youtube,
};

test('all public SMD platform routes validate input, authenticate server-side, and normalize success responses', async () => {
  await withProxyEnv(async () => {
    const forwarded = [];
    globalThis.fetch = async (url, init) => {
      forwarded.push({ url, init });
      return new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    for (const [platform, url] of Object.entries(validUrls)) {
      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);
      const upstreamPlatform = platform === 'x' || platform === 'twitter' ? 'twitter' : platform;

      assert.equal(res.statusCode, 200);
      assert.equal(body.success, true);
      assert.equal(body.platform, platform === 'twitter' ? 'x' : platform);
      assert.equal(body.data.title, 'Example media');
      assert.deepEqual(body.data.media, [
        {
          type: 'video',
          url: 'https://cdn.example/video.mp4',
          quality: 'hd',
          format: 'mp4',
        },
      ]);
      assert.equal(forwarded.at(-1).url, `https://render.example/${upstreamPlatform}/download`);
      assert.equal(forwarded.at(-1).init.headers['X-DownloadDash-Key'], 'test-key');
      assert.equal(forwarded.at(-1).init.headers.Authorization, undefined);
      assert.equal(forwarded.at(-1).init.headers.DOWNLOADDASH_API_KEY, undefined);
    }
  });
});

test('all platform routes reject missing URL, malformed URL, and wrong domains before upstream fetch', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(upstreamSuccess), { status: 200 });
    };

    for (const platform of Object.keys(validUrls)) {
      for (const [body, expectedCode] of [
        [{}, 'URL_REQUIRED'],
        [{ url: 'not-a-url' }, 'INVALID_URL'],
        [{ url: wrongDomainUrl[platform] }, 'UNSUPPORTED_DOMAIN'],
      ]) {
        const res = await request({ path: `${platform}/download`, body });
        const responseBody = readJson(res);

        assert.equal(res.statusCode, 400, `${platform} ${expectedCode}`);
        assert.equal(responseBody.error.code, expectedCode, platform);
      }
    }

    assert.equal(fetchCalled, false);
  });
});

test('browser-facing CORS does not invite clients to send private key headers', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({
      path: 'tiktok/download',
      body: { url: validUrls.tiktok },
      headers: {
        'x-downloaddash-key': 'browser-key',
        authorization: 'Bearer browser-token',
      },
    });

    const allowHeaders = res.getHeader('Access-Control-Allow-Headers');
    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(allowHeaders, /X-DownloadDash-Key/i);
    assert.doesNotMatch(allowHeaders, /DOWNLOADDASH_API_KEY/i);
    assert.doesNotMatch(allowHeaders, /Authorization/i);
  });
});

test('request validation rejects missing URL, malformed JSON, invalid URL, unsupported protocols, and wrong platform domains', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(upstreamSuccess), { status: 200 });
    };

    const cases = [
      [{ path: 'tiktok/download', body: {} }, 400, 'URL_REQUIRED'],
      [{ path: 'tiktok/download', body: '{"url":' }, 400, 'INVALID_JSON'],
      [{ path: 'tiktok/download', body: { url: 'not-a-url' } }, 400, 'INVALID_URL'],
      [{ path: 'tiktok/download', body: { url: 'file:///etc/passwd' } }, 400, 'UNSUPPORTED_PROTOCOL'],
      [{ path: 'youtube/download', body: { url: validUrls.tiktok } }, 400, 'UNSUPPORTED_DOMAIN'],
      [{ path: 'youtube/download', body: { url: 'http://127.0.0.1/admin' } }, 400, 'BLOCKED_HOST'],
    ];

    for (const [req, status, code] of cases) {
      const res = await request(req);
      assert.equal(res.statusCode, status);
      assert.equal(readJson(res).error.code, code);
    }

    assert.equal(fetchCalled, false);
  });
});

test('missing server API key returns a production-safe service configuration error before upstream fetch for every platform', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(upstreamSuccess), { status: 200 });
    };

    for (const [platform, url] of Object.entries(validUrls)) {
      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);

      assert.equal(res.statusCode, 503);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'SERVICE_CONFIGURATION_ERROR');
      assert.doesNotMatch(JSON.stringify(body), /DOWNLOADDASH_API_KEY/);
    }

    assert.equal(fetchCalled, false);
  }, { apiKey: null });
});

test('request validation runs before server environment loading', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(upstreamSuccess), { status: 200 });
    };

    const res = await request({ path: 'tiktok/download', body: { url: 'not-a-url' } });
    const body = readJson(res);

    assert.equal(res.statusCode, 400);
    assert.equal(body.error.code, 'INVALID_URL');
    assert.equal(fetchCalled, false);
  }, { apiKey: null });
});

test('health route reports safe proxy configuration status without exposing secrets', async () => {
  await withProxyEnv(async () => {
    const res = await request({ path: 'health', method: 'GET' });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.service, 'smd-proxy');
    assert.equal(body.configured, true);
    assert.equal(body.proxyConfigured, true);
    assert.equal(body.upstreamHost, 'render.example');
    assert.equal(body.apiKeyLength, undefined);
    assert.doesNotMatch(JSON.stringify(body), /test-key|DOWNLOADDASH_API_KEY|X-DownloadDash-Key/);
  });

  await withProxyEnv(async () => {
    const res = await request({ path: 'health', method: 'GET' });
    const body = readJson(res);

    assert.equal(res.statusCode, 503);
    assert.equal(body.success, false);
    assert.equal(body.service, 'smd-proxy');
    assert.equal(body.configured, false);
    assert.equal(body.proxyConfigured, false);
    assert.equal(body.upstreamHost, 'render.example');
    assert.equal(body.apiKeyLength, undefined);
    assert.doesNotMatch(JSON.stringify(body), /DOWNLOADDASH_API_KEY|X-DownloadDash-Key/);
  }, { apiKey: null });
});

test('health route can safely probe upstream reachability on request', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://render.example/health');
      return new Response(JSON.stringify({ status: 'healthy' }), { status: 200 });
    };

    const res = await request({ path: 'health', method: 'GET', query: { upstream: '1' } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.proxyConfigured, true);
    assert.equal(body.upstreamReachable, true);
    assert.equal(body.upstreamStatus, 200);
    assert.doesNotMatch(JSON.stringify(body), /test-key|DOWNLOADDASH_API_KEY|X-DownloadDash-Key/);
  });

  await withProxyEnv(async () => {
    globalThis.fetch = async () => {
      throw new TypeError('connect failed');
    };

    const res = await request({ path: 'health', method: 'GET', query: { upstream: '1' } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.proxyConfigured, true);
    assert.equal(body.upstreamReachable, false);
    assert.equal(body.upstreamStatus, null);
    assert.doesNotMatch(JSON.stringify(body), /connect failed|test-key|DOWNLOADDASH_API_KEY/);
  });
});

test('upstream status codes map to normalized downloader errors', async () => {
  const cases = [
    [401, 502, 'UPSTREAM_AUTH_FAILED'],
    [429, 429, 'UPSTREAM_RATE_LIMITED'],
    [500, 503, 'UPSTREAM_UNAVAILABLE'],
    [503, 503, 'UPSTREAM_UNAVAILABLE'],
  ];

  for (const [upstreamStatus, expectedStatus, expectedCode] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ success: false, error: 'provider failed' }), {
          status: upstreamStatus,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
      const body = readJson(res);

      assert.equal(res.statusCode, expectedStatus);
      assert.equal(body.success, false);
      assert.equal(body.error.code, expectedCode);
      assert.doesNotMatch(JSON.stringify(body), /provider failed/);
    });
  }
});

test('upstream framework-level 404 is reported as an upstream route problem', async () => {
  for (const payload of [
    { detail: 'Not Found' },
    { message: '404 Not Found' },
    'Not Found',
  ]) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
      const body = readJson(res);

      assert.equal(res.statusCode, 502);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_ROUTE_NOT_FOUND');
    });
  }
});

test('upstream media-level 404 remains media not found', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: false, error: 'Media not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
    const body = readJson(res);

    assert.equal(res.statusCode, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'MEDIA_NOT_FOUND');
  });
});

test('upstream success=false media resolver failure remains media not found', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: false,
        message: 'Resolve failed',
        error: 'No media resolver returned a result',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
    const body = readJson(res);

    assert.equal(res.statusCode, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'MEDIA_NOT_FOUND');
  });
});

test('upstream success=false login, antibot, and extractor failures keep precise resolver codes', async () => {
  const cases = [
    ['instagram', validUrls.instagram, 'COOKIE_REQUIRED', 401],
    ['facebook', validUrls.facebook, 'PLATFORM_BLOCKED_PROXY', 502],
    ['facebook', validUrls.facebook, 'ANTI_BOT_CHALLENGE', 403],
    ['facebook', validUrls.facebook, 'EXTRACTOR_OUTDATED', 502],
    ['twitter', validUrls.twitter, 'EXTRACTOR_FAILED', 502],
    ['twitter', validUrls.twitter, 'COOKIE_REQUIRED', 401],
    ['x', validUrls.x, 'RATE_LIMITED', 429],
  ];

  for (const [platform, url, resolverCode, expectedStatus] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({
          success: false,
          message: 'Resolve failed',
          error: 'raw provider details are intentionally not exposed',
          error_code: resolverCode,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);

      assert.equal(res.statusCode, expectedStatus);
      assert.equal(body.success, false);
      assert.equal(body.error.code, resolverCode);
      assert.notEqual(body.error.code, 'MEDIA_NOT_FOUND');
      assert.notEqual(body.error.code, 'PRIVATE_MEDIA');
      assert.doesNotMatch(JSON.stringify(body), /raw provider details/);
    });
  }
});

test('working platform resolver failures are protected from affected platform reclassification changes', async () => {
  const cases = [
    ['tiktok', validUrls.tiktok],
    ['pinterest', validUrls.pinterest],
    ['youtube', validUrls.youtube],
    ['reddit', validUrls.reddit],
  ];

  for (const [platform, url] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async (target) => {
        const upstreamPlatform = platform === 'youtube' ? 'youtube' : platform;
        assert.equal(target, `https://render.example/${upstreamPlatform}/download`);
        return new Response(JSON.stringify(upstreamSuccess), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };

      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);

      assert.equal(res.statusCode, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.media[0].url, 'https://cdn.example/video.mp4');
    });
  }
});

test('upstream success=false proxy-shaped resolver failure is reported separately', async () => {
  for (const errorText of [
    'The configured YouTube proxy could not complete the download.',
    'Tunnel connection failed: 407 Proxy Authentication Required',
    'proxy bandwidth quota exhausted',
  ]) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({
          success: false,
          message: 'Resolve failed',
          error: errorText,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: 'youtube/download', body: { url: validUrls.youtube } });
      const body = readJson(res);

      assert.equal(res.statusCode, 502);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_PROXY_FAILED');
    });
  }
});

test('upstream 403 Unauthorized maps to upstream auth failure, while non-auth 403 maps to private media', async () => {
  for (const [payload, expectedStatus, expectedCode] of [
    [{ success: false, message: 'Unauthorized' }, 502, 'UPSTREAM_AUTH_FAILED'],
    [{ success: false, error: 'AUTH_FAILED' }, 502, 'UPSTREAM_AUTH_FAILED'],
    [{ success: false, message: 'Private media' }, 403, 'PRIVATE_MEDIA'],
  ]) {
    await withProxyEnv(async () => {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts += 1;
        return new Response(JSON.stringify(payload), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      };

      const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
      const body = readJson(res);

      assert.equal(res.statusCode, expectedStatus);
      assert.equal(body.success, false);
      assert.equal(body.error.code, expectedCode);
      assert.equal(attempts, 1);
    });
  }
});

test('transient upstream failures are retried briefly for read-only extraction requests', async () => {
  await withProxyEnv(async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts < 3) {
        return new Response(JSON.stringify({ success: false, error: 'temporarily unavailable' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({ path: 'youtube/download', body: { url: validUrls.youtube } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(attempts, 3);
  });
});

test('authentication failures are not retried', async () => {
  await withProxyEnv(async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      return new Response(JSON.stringify({ success: false, error: 'bad key' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
    const body = readJson(res);

    assert.equal(res.statusCode, 502);
    assert.equal(body.error.code, 'UPSTREAM_AUTH_FAILED');
    assert.equal(attempts, 1);
  });
});

test('network failures are normalized as upstream unavailable', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };

    const res = await request({ path: 'facebook/download', body: { url: validUrls.facebook } });
    const body = readJson(res);

    assert.equal(res.statusCode, 503);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UPSTREAM_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(body), /fetch failed/);
  });
});

test('upstream timeout and malformed JSON responses are normalized safely', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    };

    const res = await request({ path: 'reddit/download', body: { url: validUrls.reddit } });
    assert.equal(res.statusCode, 504);
    assert.equal(readJson(res).error.code, 'UPSTREAM_TIMEOUT');
  });

  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'reddit/download', body: { url: validUrls.reddit } });
    assert.equal(res.statusCode, 502);
    assert.equal(readJson(res).error.code, 'UPSTREAM_INVALID_RESPONSE');
  });
});

test('successful upstream responses without media are treated as unsupported media', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, title: 'Metadata only' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'pinterest/download', body: { url: validUrls.pinterest } });
    assert.equal(res.statusCode, 422);
    assert.equal(readJson(res).error.code, 'UNSUPPORTED_MEDIA');
  });
});

test('fallback route inventory preserves all platform endpoints and the Twitter alias', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url), { withFileTypes: true });
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url), { withFileTypes: true });
  const smdDirectories = smdEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.deepEqual(apiEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(), [
    '_downloadDashProxy.js',
  ]);
  assert.deepEqual(smdDirectories, [
    'facebook',
    'instagram',
    'pinterest',
    'reddit',
    'tiktok',
    'twitter',
    'x',
    'youtube',
  ]);

  const fallbackRoute = await readFile(new URL('../../api/smd/[...path].js', import.meta.url), 'utf8');
  assert.match(fallbackRoute, /import handler from "\.\.\/_downloadDashProxy\.js";/);
  assert.match(fallbackRoute, /export default handler;/);

  for (const platform of ['youtube', 'instagram', 'tiktok', 'facebook', 'x', 'twitter', 'reddit', 'pinterest']) {
    const route = await readFile(new URL(`../../api/smd/${platform}/download.js`, import.meta.url), 'utf8');
    assert.equal(route.trim(), 'import handler from "../../_downloadDashProxy.js";\n\nexport default handler;');
  }
});

test('shared proxy entrypoint imports server implementation and can load without server env', async () => {
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  delete process.env.DOWNLOADDASH_API_KEY;

  try {
    const proxySource = await readFile(new URL('../../api/_downloadDashProxy.js', import.meta.url), 'utf8');
    const proxyModule = await import(`../../api/_downloadDashProxy.js?test=${Date.now()}`);

    assert.match(proxySource, /import \{ handleSmdRequest \} from "\.\.\/server\/smd\/handler\.js";/);
    assert.equal(typeof proxyModule.default, 'function');
  } finally {
    if (originalKey === undefined) {
      delete process.env.DOWNLOADDASH_API_KEY;
    } else {
      process.env.DOWNLOADDASH_API_KEY = originalKey;
    }
  }
});

test('SMD server helper modules live outside the public API tree', async () => {
  const serverEntries = await readdir(new URL('../../server/smd/', import.meta.url));
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url), { withFileTypes: true });
  const smdDirectories = smdEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  assert.deepEqual(
    serverEntries.sort(),
    [
      'client.js',
      'env.js',
      'errors.js',
      'handler.js',
      'normalize.js',
      'platforms.js',
      'rate-limit.js',
      'validation.js',
    ]
  );
  assert.equal(smdDirectories.includes('lib'), false);
});

test('API tree contains only intended JavaScript serverless entrypoints', async () => {
  const apiFiles = await listJsFiles(new URL('../../api/', import.meta.url));

  assert.deepEqual(apiFiles, intendedApiEntrypoints);
});

test('frontend clients keep DownloadDash secrets out of browser requests', async () => {
  const webClient = await readFile(new URL('../../src/api/downloadDashClient.js', import.meta.url), 'utf8');
  const mobileClient = await readFile(new URL('../../mobile/utils/api.js', import.meta.url), 'utf8');

  assert.match(webClient, /const DEFAULT_API_BASE_URL = '\/api\/smd';/);
  assert.match(webClient, /'x': 'x'/);
  assert.match(webClient, /data\?\.data\?\.media/);
  assert.match(webClient, /UPSTREAM_ROUTE_NOT_FOUND/);
  assert.doesNotMatch(webClient, /endpoint not found\. Please check your API configuration/);
  assert.doesNotMatch(webClient, /X-DownloadDash-Key|DOWNLOADDASH_API_KEY|Authorization.*Bearer/);
  assert.doesNotMatch(mobileClient, /X-DownloadDash-Key|X-API-Key|Authorization.*Bearer|apiKey/);
});

test('Vercel SPA rewrite excludes API paths so functions can handle requests', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const spaRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');

  assert.ok(config.functions['api/**/*.js']);
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(spaRewrite);
  assert.match(spaRewrite.source, /\(\?!api/);
});
