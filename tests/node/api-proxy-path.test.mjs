import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import rootHandler from '../../api/[...path].js';
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

test('Vercel SMD proxy forwards the catch-all path to the Render backend unchanged', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = 'https://render.example';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

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

  try {
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
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('Vercel SMD proxy preserves every public downloader endpoint path', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  const platforms = [
    ['youtube', 'youtube'],
    ['instagram', 'instagram'],
    ['tiktok', 'tiktok'],
    ['facebook', 'facebook'],
    ['x', 'twitter'],
    ['twitter', 'twitter'],
    ['reddit', 'reddit'],
    ['pinterest', 'pinterest'],
    ['telegram', 'telegram'],
    ['whatsapp_business', 'whatsapp_business'],
  ];
  const forwardedUrls = [];

  process.env.SMD_API_BASE_URL = 'https://render.example/';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

  globalThis.fetch = async (url) => {
    forwardedUrls.push(url);
    return new Response(
      JSON.stringify({
        success: true,
        download_url: 'https://cdn.example/video.mp4',
        downloads: { videoHD: 'https://cdn.example/video.mp4' },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };

  try {
    for (const [platform] of platforms) {
      const req = {
        method: 'POST',
        query: { path: [platform, 'download'] },
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: { url: `https://example.com/${platform}` },
      };
      await handler(req, createResponse());
    }

    assert.deepEqual(
      forwardedUrls,
      platforms.map(([, upstreamPlatform]) => `https://render.example/${upstreamPlatform}/download`)
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('root catch-all handles every public downloader endpoint without explicit Hobby-plan functions', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  const endpoints = [
    ['youtube', 'youtube'],
    ['instagram', 'instagram'],
    ['tiktok', 'tiktok'],
    ['facebook', 'facebook'],
    ['x', 'twitter'],
    ['twitter', 'twitter'],
    ['reddit', 'reddit'],
    ['pinterest', 'pinterest'],
    ['telegram', 'telegram'],
    ['whatsapp_business', 'whatsapp_business'],
  ];
  const forwardedUrls = [];
  const authHeaders = [];

  process.env.SMD_API_BASE_URL = 'https://render.example';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

  globalThis.fetch = async (url, init) => {
    forwardedUrls.push(url);
    authHeaders.push(init.headers);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    for (const [platform] of endpoints) {
      await rootHandler(
        {
          method: 'POST',
          url: `/api/${platform}/download`,
          query: {},
          headers: {
            accept: 'application/json',
            authorization: 'Bearer frontend-token',
            'content-type': 'application/json',
          },
          body: { url: `https://example.com/${platform}` },
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
    }
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('SMD catch-all handles every public downloader endpoint without explicit Hobby-plan functions', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  const endpoints = [
    ['youtube', 'youtube'],
    ['instagram', 'instagram'],
    ['tiktok', 'tiktok'],
    ['facebook', 'facebook'],
    ['x', 'twitter'],
    ['twitter', 'twitter'],
    ['reddit', 'reddit'],
    ['pinterest', 'pinterest'],
    ['telegram', 'telegram'],
    ['whatsapp_business', 'whatsapp_business'],
  ];
  const forwardedUrls = [];
  const authHeaders = [];

  process.env.SMD_API_BASE_URL = 'https://render.example';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

  globalThis.fetch = async (url, init) => {
    forwardedUrls.push(url);
    authHeaders.push(init.headers);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    for (const [platform] of endpoints) {
      await handler(
        {
          method: 'POST',
          url: `/api/smd/${platform}/download`,
          query: {},
          headers: {
            accept: 'application/json',
            authorization: 'Bearer frontend-token',
            'content-type': 'application/json',
          },
          body: { url: `https://example.com/${platform}` },
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
    }
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('Vercel SMD proxy parses req.url paths and replaces frontend Authorization upstream', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = 'https://api.downloaddash.store/api/smd/';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

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

  try {
    const req = {
      method: 'POST',
      url: '/api/smd/youtube/download',
      query: {},
      headers: {
        accept: 'application/json',
        'content-type': 'application/json; charset=utf-8',
        authorization: 'Bearer frontend-token',
      },
      body: { url: 'https://www.youtube.com/watch?v=abc123', quality: 'highest' },
    };
    const res = createResponse();

    await handler(req, res);

    assert.equal(forwarded.url, 'https://api.downloaddash.store/youtube/download');
    assert.equal(forwarded.init.method, 'POST');
    assert.equal(forwarded.init.headers['Content-Type'], 'application/json; charset=utf-8');
    assert.equal(forwarded.init.headers.Accept, 'application/json');
    assert.equal(forwarded.init.headers.Authorization, 'Bearer test-key');
    assert.equal(forwarded.init.headers.Authorization.includes('frontend-token'), false);
    assert.equal(forwarded.init.headers['X-API-Key'], 'test-key');
    assert.equal(forwarded.init.headers.DOWNLOADDASH_API_KEY, 'test-key');
    assert.equal(forwarded.init.headers['X-DownloadDash-Key'], 'test-key');
    assert.deepEqual(JSON.parse(forwarded.init.body), {
      url: 'https://www.youtube.com/watch?v=abc123',
      quality: 'highest',
    });
    assert.equal(res.statusCode, 200);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('Vercel SMD proxy supports the alternate catch-all query key used by some Vercel adapters', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = 'https://api.downloaddash.store/api';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

  let forwardedUrl;
  globalThis.fetch = async (url) => {
    forwardedUrl = url;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
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
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('root /api catch-all proxy forwards /api/youtube/download instead of serving the SPA', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;

  process.env.SMD_API_BASE_URL = 'https://api.downloaddash.store';
  process.env.DOWNLOADDASH_API_KEY = 'test-key';

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

  try {
    const req = {
      method: 'POST',
      url: '/api/youtube/download',
      query: {},
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: { url: 'https://www.youtube.com/watch?v=abc123' },
    };
    const res = createResponse();

    await rootHandler(req, res);

    assert.equal(forwarded.url, 'https://api.downloaddash.store/youtube/download');
    assert.equal(forwarded.init.method, 'POST');
    assert.equal(JSON.parse(forwarded.init.body).url, 'https://www.youtube.com/watch?v=abc123');
    assert.equal(res.statusCode, 200);
    assert.notEqual(res.headers['content-type'], 'text/html');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    process.env.DOWNLOADDASH_API_KEY = originalKey;
  }
});

test('Vercel SPA rewrite excludes API paths so functions can handle POST requests', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const apiRewrite = config.rewrites.find((rewrite) => rewrite.source === '/api/:path*');
  const spaRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');

  assert.deepEqual(apiRewrite, {
    source: '/api/:path*',
    destination: '/api/:path*',
  });
  assert.ok(config.functions['api/**/*.js']);
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(spaRewrite);
  assert.match(spaRewrite.source, /\(\?!api/);
  assert.doesNotMatch(spaRewrite.source, /^\/\(\.\*\)$/);
});

test('API fallback routes are canonical and not duplicated by optional catch-alls', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url));
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url));

  assert.ok(apiEntries.includes('[...path].js'));
  assert.ok(smdEntries.includes('[...path].js'));
  assert.equal(apiEntries.includes('[[...path]].js'), false);
  assert.equal(smdEntries.includes('[[...path]].js'), false);
});

test('Vercel Hobby deployment stays below the 12 function limit', async () => {
  const apiEntries = await readdir(new URL('../../api/', import.meta.url), { withFileTypes: true });
  const smdEntries = await readdir(new URL('../../api/smd/', import.meta.url), { withFileTypes: true });
  const rootFunctions = apiEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  const smdFunctions = smdEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));

  assert.equal(rootFunctions.some((entry) => entry.name === '[...path].js'), true);
  assert.equal(smdFunctions.some((entry) => entry.name === '[...path].js'), true);
  assert.equal(apiEntries.some((entry) => entry.isDirectory() && entry.name === 'youtube'), false);
  assert.equal(smdEntries.some((entry) => entry.isDirectory() && entry.name === 'youtube'), false);
  assert.ok(rootFunctions.length + smdFunctions.length <= 12);
});
