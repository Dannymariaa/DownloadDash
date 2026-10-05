import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import handler from '../../api/smd/[...path].js';
import { isPlatformMediaUrl, normalizePublicUrl } from '../../shared/publicUrl.js';
import { publicError, sendError } from '../../server/smd/errors.js';
import { validateFileProxyRequest } from '../../server/smd/validation.js';

test('provider timeouts explain that the provider timed out and can be retried', () => {
  const res = createResponse();
  sendError(res, publicError('PROVIDER_TIMEOUT', 504), 'timeout-test');
  assert.equal(res.statusCode, 504);
  assert.match(readJson(res).error.message, /timed out.*try again/i);
});

test('invalid managed file descriptors have file-specific errors', () => {
  for (const body of [{}, { sourceUrl: 'not a url' }]) {
    assert.throws(() => validateFileProxyRequest({ method: 'POST', body, query: {} }),
      { code: 'INVALID_FILE_REQUEST', status: 400 });
  }
});

test('Facebook named-page video URLs are valid media links', () => {
  assert.equal(isPlatformMediaUrl('https://www.facebook.com/NASAEarthData/videos/new-nasadem-is-here/221831485672197/', 'facebook'), true);
  assert.equal(isPlatformMediaUrl('https://www.facebook.com/NASAEarthData/', 'facebook'), false);
});

const intendedApiEntrypoints = [
  '_downloadDashProxy.js',
  'account/[...path].js',
  'billing/[...path].js',
  'smd/[...path].js',
  'smd/rapid-youtube-file.js',
  'smd/rapid-youtube.js',
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
  const chunks = [];
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
    write(chunk) {
      chunks.push(Buffer.from(chunk));
      return true;
    },
    end(body = '') {
      if (body !== '') chunks.push(Buffer.from(body));
      this.body = chunks.length ? Buffer.concat(chunks) : body;
      this.writableEnded = true;
      return this;
    },
  };
};

const readJson = (res) => JSON.parse(String(res.body || '{}'));

const createJsonRequest = ({ method = 'POST', url, body = {}, headers = {} }) => {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  return Object.assign(req, {
    method,
    url,
    query: {},
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    socket: { remoteAddress: '198.51.100.10' },
  });
};

const invokeHandler = async (routeHandler, options) => {
  const res = createResponse();
  await routeHandler(createJsonRequest(options), res);
  return res;
};

const withProxyEnv = async (callback, overrides = {}) => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  const originalRateLimit = process.env.SMD_RATE_LIMIT_MAX;

  process.env.SMD_API_BASE_URL = overrides.baseUrl ?? 'https://render.example';
  process.env.SMD_RATE_LIMIT_MAX = overrides.rateLimitMax ?? '10000';
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
    if (originalRateLimit === undefined) {
      delete process.env.SMD_RATE_LIMIT_MAX;
    } else {
      process.env.SMD_RATE_LIMIT_MAX = originalRateLimit;
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

test('critical SMD downloader routes are served by the consolidated catch-all', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const criticalRoutes = [
      ['youtube', validUrls.youtube],
      ['instagram', validUrls.instagram],
      ['facebook', validUrls.facebook],
      ['twitter', validUrls.twitter],
      ['x', validUrls.x],
      ['pinterest', validUrls.pinterest],
      ['reddit', validUrls.reddit],
      ['tiktok', validUrls.tiktok],
    ];

    for (const [platform, url] of criticalRoutes) {
      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);

      assert.equal(res.statusCode, 200, platform);
      assert.equal(body.success, true, platform);
      assert.notEqual(body.error?.code, 'UPSTREAM_ROUTE_NOT_FOUND', platform);
      assert.doesNotMatch(String(res.body), /<!doctype html/i, platform);
    }
  });
});

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
          index: 0,
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

test('successful proxy responses include structured lightweight timing fields', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        downloads: {
          videoHD: 'https://cdn.example/video.mp4',
          timing: {
            cacheHit: false,
            providerResolveMs: 7,
            normalizationMs: 2,
            totalMs: 12,
            resultCount: 1,
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.timing.platform, 'tiktok');
    assert.equal(body.timing.cacheHit, false);
    assert.equal(body.timing.providerResolveMs, 7);
    assert.equal(body.timing.resultCount, 1);
    assert.equal(typeof body.timing.validationMs, 'number');
    assert.equal(typeof body.timing.proxyMs, 'number');
    assert.equal(typeof body.timing.responseMs, 'number');
    assert.equal(typeof body.timing.totalMs, 'number');
  });
});

test('normalization keeps signed extensionless image metadata as image', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        media: [
          {
            type: 'image',
            url: 'https://cdn.instagram.example/media?sig=abc',
            mimeType: 'image/jpeg',
            width: 1080,
            height: 1350,
          },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(body.data.media, [
      {
        index: 0,
        type: 'image',
        url: 'https://cdn.instagram.example/media?sig=abc',
        mimeType: 'image/jpeg',
        format: 'jpg',
        width: 1080,
        height: 1350,
      },
    ]);
  });
});

test('normalization infers extensionless media from MIME and leaves unknown media unknown', async () => {
  const cases = [
    [{ url: 'https://cdn.example/image?id=1', contentType: 'image/jpeg' }, 'image', 'jpg'],
    [{ url: 'https://cdn.example/video?id=1', contentType: 'video/mp4' }, 'video', 'mp4'],
    [{ url: 'https://cdn.example/opaque?id=1' }, 'unknown', undefined],
  ];

  for (const [item, expectedType, expectedFormat] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ success: true, media: [item] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
      const body = readJson(res);

      assert.equal(res.statusCode, 200);
      assert.equal(body.data.media[0].type, expectedType);
      assert.equal(body.data.media[0].format, expectedFormat);
    });
  }
});

test('normalization preserves single image, five-image carousel, and mixed carousel ordering', async () => {
  const fiveImages = Array.from({ length: 5 }, (_, index) => ({
    id: `image-${index + 1}`,
    image_url: `https://cdn.instagram.example/${index + 1}?sig=abc`,
    contentType: 'image/jpeg',
  }));

  const cases = [
    [[fiveImages[0]], ['image']],
    [fiveImages, ['image', 'image', 'image', 'image', 'image']],
    [[
      { id: 'one', image_url: 'https://cdn.instagram.example/one?sig=abc', contentType: 'image/jpeg' },
      { id: 'two', image_url: 'https://cdn.instagram.example/two?sig=abc', contentType: 'image/jpeg' },
      { id: 'three', is_video: true, video_url: 'https://cdn.instagram.example/three?sig=abc', contentType: 'video/mp4', has_audio: true },
      { id: 'four', image_url: 'https://cdn.instagram.example/four?sig=abc', contentType: 'image/jpeg' },
    ], ['image', 'image', 'video', 'image']],
  ];

  for (const [media, expectedTypes] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ success: true, media }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
      const body = readJson(res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(body.data.media.map((item) => item.type), expectedTypes);
      assert.deepEqual(body.data.media.map((item) => item.index), expectedTypes.map((_, index) => index));
    });
  }
});

test('normalization keeps TikTok five-photo posts before separate soundtrack audio', async () => {
  await withProxyEnv(async () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      type: 'image',
      url: `https://cdn.tiktok.example/${index + 1}.jpeg`,
      contentType: 'image/jpeg',
    }));

    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        media: [
          { type: 'audio', url: 'https://cdn.tiktok.example/sound.m4a', contentType: 'audio/mp4' },
          ...images,
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(body.data.media.map((item) => item.type), ['image', 'image', 'image', 'image', 'image', 'audio']);
    assert.deepEqual(body.data.media.map((item) => item.index), [0, 1, 2, 3, 4, 5]);
  });
});

test('TikTok route accepts normal video, photo, and short-link forms before upstream fetch', async () => {
  await withProxyEnv(async () => {
    const forwarded = [];
    globalThis.fetch = async (url, init) => {
      forwarded.push({ url, init });
      return new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const urls = [
      'https://www.tiktok.com/@u/video/123?is_from_webapp=1',
      'https://tiktok.com/@u/video/123?sender_device=pc',
      'https://www.tiktok.com/@u/photo/123?is_from_webapp=1&sender_device=pc',
      'https://tiktok.com/@u/photo/123',
      'https://vm.tiktok.com/ZMabc123/',
      'https://vt.tiktok.com/ZMabc123/',
    ];

    for (const url of urls) {
      const res = await request({ path: 'tiktok/download', body: { url } });
      assert.equal(res.statusCode, 200, url);
    }

    const upstreamPosts = forwarded.filter((entry) => entry.init?.method === 'POST');
    assert.equal(upstreamPosts.length, urls.length);
    assert.equal(
      JSON.parse(upstreamPosts[0].init.body).url,
      'https://www.tiktok.com/@u/video/123?is_from_webapp=1'
    );
  });
});

test('TikTok short links expand safely to canonical TikTok URLs', async () => {
  await withProxyEnv(async () => {
    const forwarded = [];
    globalThis.fetch = async (url, init) => {
      if (init?.method === 'HEAD') {
        return new Response('', {
          status: 302,
          headers: { location: 'https://www.tiktok.com/@creator/video/123?sender_device=pc' },
        });
      }
      forwarded.push({ url, init });
      return new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({ path: 'tiktok/download', body: { url: 'https://vm.tiktok.com/ZMabc123/' } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(JSON.parse(forwarded[0].init.body).url, 'https://www.tiktok.com/@creator/video/123?sender_device=pc');
  });
});

test('TikTok short-link expansion rejects off-platform redirects', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response('', {
        status: 302,
        headers: { location: 'https://example.com/@creator/video/123' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: 'https://vt.tiktok.com/ZMabc123/' } });
    const body = readJson(res);

    assert.equal(res.statusCode, 400);
    assert.equal(body.error.code, 'UNSUPPORTED_DOMAIN');
  });
});

test('TikTok route rejects wrong domains and malformed URLs before upstream fetch', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(upstreamSuccess), { status: 200 });
    };

    for (const [url, expectedCode] of [
      ['https://youtube.com/watch?v=abc123', 'UNSUPPORTED_DOMAIN'],
      ['https://evil-tiktok.com/@u/video/123', 'UNSUPPORTED_DOMAIN'],
      ['https://www.tiktok.com/@u/profile', 'INVALID_URL'],
      ['notaurl', 'INVALID_URL'],
    ]) {
      const res = await request({ path: 'tiktok/download', body: { url } });
      assert.equal(res.statusCode, 400, url);
      assert.equal(readJson(res).error.code, expectedCode, url);
    }

    assert.equal(fetchCalled, false);
  });
});

test('shared URL normalization accepts supported copied public URL forms and rejects unsafe input', () => {
  const accepted = [
    ['tiktok', ' "https:\\/\\/www.tiktok.com\\/@user\\/video\\/123?utm_source=x&is_from_webapp=1" ', 'https://www.tiktok.com/@user/video/123?is_from_webapp=1'],
    ['tiktok', 'https://www.tiktok.com/@user/photo/123'],
    ['tiktok', 'https://vm.tiktok.com/ZMabc123/'],
    ['tiktok', 'https://vt.tiktok.com/ZMabc123/'],
    ['youtube', 'https://www.youtube.com/watch?v=abc123&utm_campaign=x', 'https://www.youtube.com/watch?v=abc123'],
    ['youtube', 'https://youtu.be/abc123'],
    ['youtube', 'https://youtube.com/shorts/abc123'],
    ['youtube', 'https://m.youtube.com/live/abc123'],
    ['instagram', 'https://instagram.com/p/ABC123/'],
    ['instagram', 'https://instagram.com/reels/ABC123/'],
    ['instagram', 'https://instagram.com/stories/user/123/'],
    ['facebook', 'https://www.facebook.com/share/p/abc123/'],
    ['facebook', 'https://m.facebook.com/reel/123'],
    ['facebook', 'https://web.facebook.com/watch/?v=123'],
    ['reddit', 'https://www.reddit.com/r/test/comments/abc/title/'],
    ['reddit', 'https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3'],
    ['reddit', 'https://redd.it/abc123'],
    ['pinterest', 'https://www.pinterest.com/pin/123/'],
    ['pinterest', 'https://pin.it/abc123'],
    ['x', 'https://x.com/user/status/123'],
    ['x', 'https://www.twitter.com/user/status/123'],
  ];

  for (const [platform, rawUrl, expectedUrl] of accepted) {
    const normalized = normalizePublicUrl(rawUrl, { platform });
    assert.equal(normalized.ok, true, rawUrl);
    assert.equal(normalized.platform, platform === 'twitter' ? 'x' : platform, rawUrl);
    if (expectedUrl) assert.equal(normalized.url, expectedUrl, rawUrl);
  }

  for (const rawUrl of [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,hi',
    'http://localhost:3000/media',
    'http://127.0.0.1/media',
    'https://evil-tiktok.com/@user/video/123',
    'https://user:pass@tiktok.com/@user/video/123',
    'https://www.youtube.com:8443/watch?v=abc123',
  ]) {
    const normalized = normalizePublicUrl(rawUrl, { requireSupported: true });
    assert.equal(normalized.ok, false, rawUrl);
  }
});

test('URL normalization preserves encoded query values and decodes a whole URL at most once', () => {
  const plain = 'https://www.tiktok.com/@creator/video/123?token=a%2Fb&lang=en';
  assert.equal(normalizePublicUrl(plain, { platform: 'tiktok' }).url, plain);
  assert.equal(normalizePublicUrl(encodeURIComponent(plain), { platform: 'tiktok' }).url, plain);
  assert.equal(normalizePublicUrl(encodeURIComponent(encodeURIComponent(plain)), { platform: 'tiktok' }).ok, false);
});

test('shared media URL policy accepts Reddit share URLs and YouTube live URLs on UI paths', () => {
  for (const [platform, url] of [
    ['reddit', 'https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3'],
    ['reddit', 'https://redd.it/FGKVVqzTy3'],
    ['youtube', 'https://youtube.com/live/abc123'],
    ['youtube', 'https://youtube.com/shorts/abc123'],
    ['youtube', 'https://youtube.com/watch?v=abc123'],
  ]) {
    assert.equal(isPlatformMediaUrl(url, platform), true, url);
  }
  assert.equal(isPlatformMediaUrl('https://www.reddit.com/r/nigerianfood/', 'reddit'), false);
  assert.equal(isPlatformMediaUrl('https://youtube.com/watch', 'youtube'), false);
});

test('Reddit share links expand only across HTTPS Reddit hosts', async () => {
  await withProxyEnv(async () => {
    const forwarded = [];
    globalThis.fetch = async (url, init) => {
      if (init?.method === 'HEAD') {
        return new Response('', {
          status: 302,
          headers: { location: 'https://www.reddit.com/r/nigerianfood/comments/abc123/title/' },
        });
      }
      forwarded.push({ url, init });
      return new Response(JSON.stringify(upstreamSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({ path: 'reddit/download', body: { url: 'https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3' } });
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(forwarded[0].init.body).url, 'https://www.reddit.com/r/nigerianfood/comments/abc123/title/');
  });
});

test('all seven platform video fixtures expose playable video with audio and separate audio', async () => {
  const cases = [
    ['tiktok', validUrls.tiktok],
    ['instagram', validUrls.instagram],
    ['facebook', validUrls.facebook],
    ['youtube', validUrls.youtube],
    ['reddit', validUrls.reddit],
    ['pinterest', validUrls.pinterest],
    ['x', validUrls.x],
  ];

  for (const [platform, url] of cases) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({
          success: true,
          downloads: {
            videoHD: `https://cdn.${platform}.example/video-hd.mp4`,
            videoSD: `https://cdn.${platform}.example/video-sd.mp4`,
            audio: `https://cdn.${platform}.example/audio.m4a`,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);

      assert.equal(res.statusCode, 200, platform);
      assert.deepEqual(body.data.media.map((item) => item.type), ['video', 'audio'], platform);
      assert.equal(body.data.media[0].hasAudio, true, platform);
      assert.equal(body.data.media[0].variants.length, 2, platform);
      assert.equal(body.data.media[1].type, 'audio', platform);
    });
  }
});

test('photo and gallery fixtures keep exact canonical counts plus soundtrack audio', async () => {
  const cases = [
    ['tiktok', validUrls.tiktok, 10, true],
    ['instagram', validUrls.instagram, 4, false],
    ['facebook', validUrls.facebook, 6, true],
    ['reddit', validUrls.reddit, 3, false],
    ['x', validUrls.x, 4, false],
    ['pinterest', validUrls.pinterest, 1, false],
  ];

  for (const [platform, url, photoCount, withAudio] of cases) {
    await withProxyEnv(async () => {
      const photos = Array.from({ length: photoCount }, (_, index) => ({
        type: 'image',
        url: `https://cdn.${platform}.example/photo-${index + 1}.jpg`,
        mimeType: 'image/jpeg',
      }));
      globalThis.fetch = async () =>
        new Response(JSON.stringify({
          success: true,
          media: withAudio
            ? [...photos, { type: 'audio', url: `https://cdn.${platform}.example/sound.m4a`, mimeType: 'audio/mp4' }]
            : photos,
          thumbnail: `https://cdn.${platform}.example/preview.mp4`,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      const res = await request({ path: `${platform}/download`, body: { url } });
      const body = readJson(res);
      const mediaTypes = body.data.media.map((item) => item.type);

      assert.equal(res.statusCode, 200, platform);
      assert.equal(mediaTypes.filter((type) => type === 'image').length, photoCount, platform);
      assert.equal(mediaTypes.filter((type) => type === 'video').length, 0, platform);
      assert.equal(mediaTypes.filter((type) => type === 'audio').length, withAudio ? 1 : 0, platform);
    });
  }
});

test('normalization keeps quality variants nested under one source video', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        downloads: {
          items: [
            {
              type: 'video',
              url: 'https://cdn.tiktok.example/video-1080.mp4',
              quality: 'hd',
              variants: [
                { url: 'https://cdn.tiktok.example/video-1080.mp4', height: 1080, format: 'mp4' },
                { url: 'https://cdn.tiktok.example/video-480.mp4', height: 480, format: 'mp4' },
              ],
            },
            { type: 'audio', url: 'https://cdn.tiktok.example/audio.m4a' },
          ],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(body.data.media.map((item) => item.type), ['video', 'audio']);
    assert.deepEqual(body.data.media.map((item) => item.index), [0, 1]);
    assert.deepEqual(body.data.media[0].variants.map((variant) => variant.height), [1080, 480]);
  });
});

test('normalization collapses scalar video quality downloads into one source video', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        downloads: {
          videoHD: 'https://cdn.tiktok.example/video-1080.mp4',
          videoSD: 'https://cdn.tiktok.example/video-480.mp4',
          audio: 'https://cdn.tiktok.example/audio.m4a',
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'tiktok/download', body: { url: validUrls.tiktok } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(body.data.media.map((item) => item.type), ['video', 'audio']);
    assert.deepEqual(body.data.media.map((item) => item.index), [0, 1]);
    assert.deepEqual(body.data.media[0].variants.map((variant) => variant.quality), ['hd', 'sd']);
  });
});

test('normalization deduplicates nested provider duplicates without turning thumbnails into media', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        thumbnail: 'https://cdn.instagram.example/thumb.jpg',
        media: [
          {
            id: 'carousel-1',
            is_video: true,
            video_url: 'https://cdn.instagram.example/video?sig=abc',
            display_url: 'https://cdn.instagram.example/thumb.jpg',
            contentType: 'video/mp4',
            thumbnail: 'https://cdn.instagram.example/thumb.jpg',
            has_audio: true,
            audio_url: 'https://cdn.instagram.example/audio.m4a',
          },
        ],
        media_info: {
          edge_sidecar_to_children: {
            edges: [
              {
                node: {
                  id: 'carousel-1',
                  is_video: true,
                  video_url: 'https://cdn.instagram.example/video?sig=abc',
                  display_url: 'https://cdn.instagram.example/thumb.jpg',
                  contentType: 'video/mp4',
                  thumbnail: 'https://cdn.instagram.example/thumb.jpg',
                },
              },
            ],
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'instagram/download', body: { url: validUrls.instagram } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.data.media.length, 1);
    assert.equal(body.data.media[0].type, 'video');
    assert.equal(body.data.media[0].url, 'https://cdn.instagram.example/video?sig=abc');
    assert.equal(body.data.media[0].thumbnail, 'https://cdn.instagram.example/thumb.jpg');
    assert.equal(body.data.media[0].hasAudio, true);
    assert.equal(body.data.media[0].audioUrl, 'https://cdn.instagram.example/audio.m4a');
  });
});

test('normalization removes duplicate YouTube aliases and does not keep unknown copies of playable media', async () => {
  await withProxyEnv(async () => {
    const signedUrl = 'https://rr1---sn.example.googlevideo.com/videoplayback?expire=1&mime=video%2Fmp4';

    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        media_info: {
          title: 'YouTube audio',
          thumbnail_url: 'https://i.ytimg.com/vi_webp/example/maxresdefault.webp',
        },
        downloads: {
          videoHD: signedUrl,
          items: [
            {
              id: 'media-0',
              index: 0,
              type: 'audio',
              url: signedUrl,
              extension: 'mp4',
              width: 640,
              height: 360,
              hasAudio: false,
              thumbnail: 'https://i.ytimg.com/vi_webp/example/maxresdefault.webp',
            },
          ],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'youtube/download', body: { url: validUrls.youtube } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(body.data.media.map((item) => item.url), [signedUrl]);
    assert.deepEqual(body.data.media.map((item) => item.type), ['video']);
    assert.equal(body.data.media.some((item) => item.type === 'unknown'), false);
  });
});

test('YouTube HD and SD mux endpoints normalize as playable video items with audio', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        success: true,
        media_info: {
          title: 'Long YouTube video',
          duration: 10800,
          thumbnail_url: 'https://i.ytimg.com/vi_webp/example/maxresdefault.webp',
        },
        downloads: {
          videoHD: '/youtube/file?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123&variant=hd',
          videoSD: '/youtube/file?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123&variant=sd',
          audio: '/youtube/file?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123&variant=audio',
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const res = await request({ path: 'youtube/download', body: { url: validUrls.youtube } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.data.media[0].type, 'video');
    assert.equal(body.data.media[0].hasAudio, true);
    assert.deepEqual(body.data.media[0].variants.map((variant) => variant.quality), ['hd', 'sd']);
    assert.equal(body.data.media[1].type, 'audio');
    assert.equal(body.data.duration, 10800);
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

test('upstream health timeout remains truthful and bounded', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async (_url, init) => {
      await new Promise((resolve, reject) => {
        init.signal.addEventListener(
          'abort',
          () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          { once: true }
        );
      });
    };

    const startedAt = Date.now();
    const res = await request({ path: 'health', method: 'GET', query: { upstream: '1' } });
    const body = readJson(res);
    const elapsed = Date.now() - startedAt;

    assert.equal(res.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.upstreamReachable, false);
    assert.equal(body.upstreamStatus, null);
    assert.ok(body.upstreamLatencyMs >= 1_000);
    // The opt-in probe allows a normal Render cold wake (up to ten seconds),
    // while still remaining bounded and independent of resolver timeouts.
    assert.ok(body.upstreamLatencyMs < 12_000);
    assert.ok(elapsed < 12_500);
  });
});

test('diagnostics route forwards sanitized provider probes through server-side auth', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async (url, init) => {
      const target = new URL(url);
      assert.equal(target.origin + target.pathname, 'https://render.example/diagnostics/provider');
      assert.equal(target.searchParams.get('platform'), 'tiktok');
      assert.equal(target.searchParams.get('url'), validUrls.tiktok);
      assert.equal(target.searchParams.get('probe_proxy'), 'true');
      assert.equal(init.method, 'GET');
      assert.equal(init.headers['X-DownloadDash-Key'], 'test-key');
      return new Response(JSON.stringify({
        platform: 'tiktok',
        proxyConfigured: true,
        cookiesConfigured: false,
        directConnectionSucceeds: 'NOT_SAFE_TO_TEST',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({
      path: 'diagnostics/provider',
      method: 'GET',
      query: {
        platform: 'tiktok',
        url: validUrls.tiktok,
        probe_proxy: '1',
      },
    });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.platform, 'tiktok');
    assert.equal(body.proxyConfigured, true);
    assert.doesNotMatch(JSON.stringify(body), /test-key|DOWNLOADDASH_API_KEY|X-DownloadDash-Key/);
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
      if (attempts < 2) {
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
    assert.equal(attempts, 2);
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

test('structured permanent resolver errors are not retried even with upstream 5xx status', async () => {
  const permanentCodes = [
    ['LOGIN_REQUIRED', 401],
    ['COOKIE_REQUIRED', 401],
    ['COOKIE_EXPIRED', 401],
    ['PRIVATE_MEDIA', 403],
    ['MEDIA_NOT_FOUND', 404],
    ['ANTI_BOT_CHALLENGE', 403],
    ['UNSUPPORTED_MEDIA', 422],
  ];

  for (const [resolverCode, expectedStatus] of permanentCodes) {
    await withProxyEnv(async () => {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts += 1;
        return new Response(JSON.stringify({
          success: false,
          error_code: resolverCode,
          error: 'raw upstream account locked cookies.txt token=secret',
        }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        });
      };

      const res = await request({ path: 'x/download', body: { url: validUrls.x } });
      const body = readJson(res);

      assert.equal(res.statusCode, expectedStatus, resolverCode);
      assert.equal(body.error.code, resolverCode);
      assert.equal(attempts, 1, resolverCode);
      assert.doesNotMatch(JSON.stringify(body), /account locked|cookies\.txt|token=secret/);
    });
  }
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

test('generic file downloads hand off GET and POST to scoped Render tickets without transferring bytes', async () => {
  for (const method of ['GET', 'POST']) {
    await withProxyEnv(async () => {
      globalThis.fetch = async () => { assert.fail('Vercel must not transfer the file'); };
      const payload = { url: 'https://p16.tiktokcdn.com/photo.jpg', sourceUrl: validUrls.tiktok,
        mediaType: 'image', filename: 'photo.jpg' };
      const res = await request({ path: 'download/file', method,
        ...(method === 'GET' ? { query: payload } : { body: payload }) });
      assert.equal(res.statusCode, 303);
      const location = new URL(res.getHeader('Location'));
      assert.equal(location.origin, 'https://render.example');
      assert.equal(location.pathname, '/download/file');
      for (const [key, value] of Object.entries(payload)) assert.equal(location.searchParams.get(key), value);
      const expires = location.searchParams.get('expires');
      const expected = createHmac('sha256', process.env.DOWNLOADDASH_API_KEY)
        .update(['v2', 'GET', '/download/file', expires, payload.url, payload.sourceUrl,
          payload.mediaType, payload.filename].join('\n')).digest('hex');
      assert.equal(location.searchParams.get('signature'), expected);
      assert.equal(location.toString().includes(process.env.DOWNLOADDASH_API_KEY), false);
      assert.equal(res.getHeader('Cache-Control'), 'no-store');
      const rejected = await request({ path: 'download/file', body: { ...payload, url: 'https://attacker.example/a.jpg' } });
      assert.equal(rejected.statusCode, 400);
    });
  }
});

test('source-only heavy file handoff preserves selected variant and filename', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () => { assert.fail('heavy work belongs on Render'); };
    const res = await request({ path: 'download/file', body: {
      sourceUrl: validUrls.pinterest, mediaType: 'sd', filename: 'clip.mp4' } });
    assert.equal(res.statusCode, 303);
    const target = new URL(res.getHeader('Location'));
    assert.equal(target.searchParams.get('url'), '');
    assert.equal(target.searchParams.get('sourceUrl'), validUrls.pinterest);
    assert.equal(target.searchParams.get('mediaType'), 'sd');
    assert.equal(target.searchParams.get('filename'), 'clip.mp4');
  });
});

test('youtube file downloads redirect to Render instead of buffering through Vercel', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };

    const youtubeUrl = validUrls.youtube;
    const res = await request({
      path: 'youtube/file',
      method: 'GET',
      query: {
        url: youtubeUrl,
        variant: 'hd',
      },
    });

    assert.equal(res.statusCode, 307);
    assert.equal(fetchCalled, false);
    const location = new URL(res.getHeader('Location'));
    assert.equal(location.origin, 'https://render.example');
    assert.equal(location.pathname, '/youtube/file');
    assert.equal(location.searchParams.get('url'), youtubeUrl);
    assert.equal(location.searchParams.get('variant'), 'hd');
    const expires = location.searchParams.get('expires');
    assert.ok(Number(expires) > Date.now() / 1000);
    assert.ok(Number(expires) <= Date.now() / 1000 + 300);
    const expected = createHmac('sha256', process.env.DOWNLOADDASH_API_KEY)
      .update(['v1', 'GET', '/youtube/file', expires, youtubeUrl, 'hd'].join('\n')).digest('hex');
    assert.equal(location.searchParams.get('signature'), expected);
    assert.equal(location.toString().includes(process.env.DOWNLOADDASH_API_KEY), false);
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

test('fallback route inventory keeps SMD consolidated behind one catch-all entrypoint', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url), { withFileTypes: true });
  const smdFiles = await listJsFiles(new URL('../../api/smd/', import.meta.url));

  assert.deepEqual(apiEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(), ['_downloadDashProxy.js']);
  assert.ok(smdFiles.includes('[...path].js'), 'api/smd/[...path].js must remain the production downloader catch-all');
  assert.deepEqual(smdFiles, ['[...path].js', 'rapid-youtube-file.js', 'rapid-youtube.js']);

  const fallbackRoute = await readFile(new URL('../../api/smd/[...path].js', import.meta.url), 'utf8');
  assert.match(fallbackRoute, /import handler from "\.\.\/_downloadDashProxy\.js";/);
  assert.match(fallbackRoute, /export default handler;/);
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

test('Vercel API tree stays within the Hobby serverless function budget', async () => {
  const apiFiles = await listJsFiles(new URL('../../api/', import.meta.url));

  assert.ok(apiFiles.length <= 10, `expected no more than 10 API functions, found ${apiFiles.length}`);
});

test('account routes are served by the account catch-all', async () => {
  const account = (await import('../../api/account/[...path].js')).default;

  const me = await invokeHandler(account, { method: 'GET', url: '/api/account/me' });
  assert.equal(me.statusCode, 200);
  assert.equal(readJson(me).authenticated, false);

  const login = await invokeHandler(account, {
    method: 'POST',
    url: '/api/account/login',
    body: { email: 'nobody@example.com', password: 'Incorrect 123' },
  });
  assert.equal(login.statusCode, 401);
  assert.equal(readJson(login).error, 'login_failed');

  const signup = await invokeHandler(account, {
    method: 'POST',
    url: '/api/account/signup',
    body: { email: `route-signup-${Date.now()}@example.com`, password: 'Correct Horse 123' },
  });
  assert.equal(signup.statusCode, 201);
  assert.ok(signup.getHeader('set-cookie'));
});

test('billing routes are served by the billing catch-all', async () => {
  const billing = (await import('../../api/billing/[...path].js')).default;

  const checkout = await invokeHandler(billing, { method: 'POST', url: '/api/billing/checkout' });
  assert.equal(checkout.statusCode, 401);
  assert.equal(readJson(checkout).error, 'checkout_failed');

  const webhook = await invokeHandler(billing, {
    method: 'POST',
    url: '/api/billing/webhook',
    body: { id: 'evt_route_test', type: 'checkout.completed', userId: 'usr_route_test' },
    headers: { 'x-downloaddash-signature': 'bad-signature' },
  });
  assert.equal(webhook.statusCode, 401);
  assert.equal(readJson(webhook).error, 'webhook_rejected');
});

test('Pro catch-all routes reject unknown paths and wrong HTTP methods', async () => {
  const account = (await import('../../api/account/[...path].js')).default;
  const billing = (await import('../../api/billing/[...path].js')).default;

  const unknownAccount = await invokeHandler(account, { method: 'GET', url: '/api/account/unknown' });
  assert.equal(unknownAccount.statusCode, 404);
  assert.equal(readJson(unknownAccount).error, 'not_found');

  const unknownBilling = await invokeHandler(billing, { method: 'POST', url: '/api/billing/unknown' });
  assert.equal(unknownBilling.statusCode, 404);
  assert.equal(readJson(unknownBilling).error, 'not_found');

  const wrongAccountMethod = await invokeHandler(account, { method: 'POST', url: '/api/account/me' });
  assert.equal(wrongAccountMethod.statusCode, 405);
  assert.equal(readJson(wrongAccountMethod).error, 'method_not_allowed');

  const wrongBillingMethod = await invokeHandler(billing, { method: 'GET', url: '/api/billing/webhook' });
  assert.equal(wrongBillingMethod.statusCode, 405);
  assert.equal(readJson(wrongBillingMethod).error, 'method_not_allowed');
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
  const smdRewriteIndex = config.rewrites.findIndex((rewrite) => rewrite.destination === '/api/smd/[...path]');
  const accountRewriteIndex = config.rewrites.findIndex((rewrite) => rewrite.destination === '/api/account/[...path]');
  const billingRewriteIndex = config.rewrites.findIndex((rewrite) => rewrite.destination === '/api/billing/[...path]');
  const spaRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');
  const spaRewriteIndex = config.rewrites.indexOf(spaRewrite);

  assert.ok(config.functions['api/**/*.js']);
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(smdRewriteIndex >= 0);
  assert.ok(accountRewriteIndex >= 0);
  assert.ok(billingRewriteIndex >= 0);
  assert.ok(accountRewriteIndex < spaRewriteIndex);
  assert.ok(billingRewriteIndex < spaRewriteIndex);
  assert.ok(smdRewriteIndex < spaRewriteIndex);
  assert.equal(config.rewrites[smdRewriteIndex].source, '/api/smd/:path*');
  assert.equal(config.rewrites[accountRewriteIndex].source, '/api/account/:path*');
  assert.equal(config.rewrites[billingRewriteIndex].source, '/api/billing/:path*');
  assert.ok(spaRewrite);
  assert.match(spaRewrite.source, /\(\?!api/);
});
