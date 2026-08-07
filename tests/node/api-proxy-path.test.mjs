import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import handler from '../../api/smd/[...path].js';

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

const withProxyEnv = async (callback) => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = 'https://render.example';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
};

test('Vercel SMD proxy forwards the catch-all path to the Render backend unchanged', async () => {
  await withProxyEnv(async () => {
    let forwarded;
    globalThis.fetch = async (url, init) => {
      forwarded = { url, init };
      return new Response(
        JSON.stringify({
          success: true,
          download_url: 'https://cdn.example/video.mp4',
          downloads: { videoHD: 'https://cdn.example/video.mp4' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    };

    const req = {
      method: 'POST',
      query: { path: ['youtube', 'download'] },
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: { url: 'https://www.youtube.com/watch?v=abc123' },
    };
    const res = createResponse();

    await handler(req, res);

    assert.equal(forwarded.url, 'https://render.example/youtube/download');
    assert.equal(forwarded.init.method, 'POST');
    assert.equal(forwarded.init.headers['X-DownloadDash-Key'], 'test-key');
    assert.equal(JSON.parse(forwarded.init.body).url, 'https://www.youtube.com/watch?v=abc123');
    assert.equal(res.statusCode, 200);
    assert.match(String(res.body), /videoHD/);
  });
});

test('SMD catch-all handles every public downloader endpoint without platform-specific functions', async () => {
  await withProxyEnv(async () => {
    const endpoints = [
      ['/api/smd/youtube/download', 'youtube'],
      ['/api/smd/instagram/download', 'instagram'],
      ['/api/smd/tiktok/download', 'tiktok'],
      ['/api/smd/facebook/download', 'facebook'],
      ['/api/smd/x/download', 'twitter'],
      ['/api/smd/twitter/download', 'twitter'],
      ['/api/smd/reddit/download', 'reddit'],
      ['/api/smd/pinterest/download', 'pinterest'],
      ['/api/smd/telegram/download', 'telegram'],
      ['/api/smd/whatsapp_business/download', 'whatsapp_business'],
    ];
    const forwardedUrls = [];
    const authHeaders = [];

    globalThis.fetch = async (url, init) => {
      forwardedUrls.push(url);
      authHeaders.push(init.headers);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    for (const [url] of endpoints) {
      await handler(
        {
          method: 'POST',
          url,
          query: {},
          headers: {
            accept: 'application/json',
            authorization: 'Bearer frontend-token',
            'content-type': 'application/json',
          },
          body: { url: 'https://example.com/media' },
        },
        createResponse()
      );
    }

    assert.deepEqual(
      forwardedUrls,
      endpoints.map(([, upstreamPlatform]) => `https://render.example/${upstreamPlatform}/download`)
    );

    for (const headers of authHeaders) {
      assert.equal(headers['X-DownloadDash-Key'], 'test-key');
      assert.equal(headers['X-API-Key'], 'test-key');
      assert.equal(headers.DOWNLOADDASH_API_KEY, 'test-key');
      assert.equal(headers.Authorization, 'Bearer test-key');
      assert.equal(headers.Authorization.includes('frontend-token'), false);
    }
  });
});

test('Vercel SMD proxy supports the alternate catch-all query key used by some Vercel adapters', async () => {
  const originalBase = process.env.SMD_API_BASE_URL;

  await withProxyEnv(async () => {
    process.env.SMD_API_BASE_URL = 'https://api.downloaddash.store/api';

    let forwardedUrl;
    globalThis.fetch = async (url) => {
      forwardedUrl = url;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    await handler(
      {
        method: 'POST',
        query: { '...path': ['youtube', 'download'] },
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: { url: 'https://www.youtube.com/watch?v=abc123' },
      },
      createResponse()
    );

    assert.equal(forwardedUrl, 'https://api.downloaddash.store/youtube/download');
  });

  process.env.SMD_API_BASE_URL = originalBase;
});

test('root /api URLs are not accepted by the SMD proxy URL parser', async () => {
  await withProxyEnv(async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = createResponse();
    await handler(
      {
        method: 'POST',
        url: '/api/youtube/download',
        query: {},
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: { url: 'https://www.youtube.com/watch?v=abc123' },
      },
      res
    );

    assert.equal(fetchCalled, false);
    assert.equal(res.statusCode, 404);
    assert.match(String(res.body), /PROXY_PATH_MISSING/);
  });
});

test('frontend API client defaults to the /api/smd namespace', async () => {
  const client = await readFile(new URL('../../src/api/downloadDashClient.js', import.meta.url), 'utf8');

  assert.match(client, /const DEFAULT_API_BASE_URL = '\/api\/smd';/);
  assert.doesNotMatch(client, /const DEFAULT_API_BASE_URL = '\/api';/);
});

test('Vercel SPA rewrite excludes API paths so functions can handle requests', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const spaRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');

  assert.equal(config.rewrites.some((rewrite) => rewrite.source === '/api/:path*'), false);
  assert.ok(config.functions['api/**/*.js']);
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(spaRewrite);
  assert.match(spaRewrite.source, /\(\?!api/);
  assert.doesNotMatch(spaRewrite.source, /^\/\(\.\*\)$/);
});

test('API fallback route is canonical and not duplicated by optional catch-alls', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url));
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url));

  assert.ok(apiEntries.includes('_downloadDashProxy.js'));
  assert.equal(apiEntries.includes('[...path].js'), false);
  assert.equal(apiEntries.includes('rapid-youtube.js'), false);
  assert.equal(apiEntries.includes('rapid-youtube-file.js'), false);
  assert.ok(smdEntries.includes('[...path].js'));
  assert.ok(smdEntries.includes('rapid-youtube.js'));
  assert.ok(smdEntries.includes('rapid-youtube-file.js'));
  assert.equal(smdEntries.includes('[[...path]].js'), false);
});

test('required physical SMD platform routes delegate directly to the shared proxy', async () => {
  const platforms = [
    'youtube',
    'instagram',
    'tiktok',
    'facebook',
    'x',
    'twitter',
    'reddit',
    'pinterest',
    'telegram',
    'whatsapp_business',
  ];
  const expected = 'import handler from "../../_downloadDashProxy.js";\n\nexport default handler;';

  for (const platform of platforms) {
    const route = await readFile(
      new URL(`../../api/smd/${platform}/download.js`, import.meta.url),
      'utf8'
    );

    assert.equal(route.trim(), expected);
  }
});

test('RapidAPI endpoints are restored under the /api/smd namespace', async () => {
  const rapidYoutube = await readFile(new URL('../../api/smd/rapid-youtube.js', import.meta.url), 'utf8');
  const rapidYoutubeFile = await readFile(
    new URL('../../api/smd/rapid-youtube-file.js', import.meta.url),
    'utf8'
  );

  assert.match(rapidYoutube, /RAPIDAPI_YOUTUBE_HOST/);
  assert.match(rapidYoutube, /\/api\/smd\/rapid-youtube-file\?/);
  assert.doesNotMatch(rapidYoutube, /\/api\/rapid-youtube-file\?/);
  assert.match(rapidYoutubeFile, /RapidAPI file download failed/);
});

test('physical API file inventory reflects the requested SMD routes', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url), { withFileTypes: true });
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url), { withFileTypes: true });
  const rootFunctions = apiEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  const smdFunctions = smdEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  const smdDirectories = smdEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.deepEqual(rootFunctions.map((entry) => entry.name).sort(), ['_downloadDashProxy.js']);
  assert.deepEqual(smdFunctions.map((entry) => entry.name).sort(), [
    '[...path].js',
    'rapid-youtube-file.js',
    'rapid-youtube.js',
  ]);
  assert.deepEqual(smdDirectories, [
    'facebook',
    'instagram',
    'pinterest',
    'reddit',
    'telegram',
    'tiktok',
    'twitter',
    'whatsapp_business',
    'x',
    'youtube',
  ]);
  assert.equal(apiEntries.some((entry) => entry.isDirectory() && entry.name !== 'smd'), false);
});
