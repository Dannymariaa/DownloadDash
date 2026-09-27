import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

import handler from '../../api/smd/[...path].js';
import { createAccountService } from '../../server/pro/account-service.js';
import { getAccountStore } from '../../server/pro/account-store.js';

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

const request = async ({ body, headers = {} }) => {
  const res = createResponse();
  const req = Readable.from([]);
  Object.assign(req, {
    method: 'POST',
    url: '/api/smd/batch/download',
    query: {},
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...headers,
    },
    body,
    socket: { remoteAddress: '198.51.100.10' },
  });
  await handler(req, res);
  return res;
};

const withProxyEnv = async (callback, overrides = {}) => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.SMD_API_BASE_URL;
  const originalKey = process.env.DOWNLOADDASH_API_KEY;
  const originalConcurrency = process.env.SMD_BATCH_CONCURRENCY;

  process.env.SMD_API_BASE_URL = overrides.baseUrl ?? 'https://render.example';
  process.env.DOWNLOADDASH_API_KEY = overrides.apiKey ?? 'test-key';
  if (overrides.batchConcurrency === undefined) delete process.env.SMD_BATCH_CONCURRENCY;
  else process.env.SMD_BATCH_CONCURRENCY = String(overrides.batchConcurrency);

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMD_API_BASE_URL = originalBase;
    if (originalKey === undefined) delete process.env.DOWNLOADDASH_API_KEY;
    else process.env.DOWNLOADDASH_API_KEY = originalKey;
    if (originalConcurrency === undefined) delete process.env.SMD_BATCH_CONCURRENCY;
    else process.env.SMD_BATCH_CONCURRENCY = originalConcurrency;
  }
};

const makeProCookie = async () => {
  const store = getAccountStore();
  const service = createAccountService({ store });
  const email = `batch-pro-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const user = await service.createUser({ email, password: 'Correct Horse 123' });
  await store.upsertSubscription({
    userId: user.id,
    plan: 'pro',
    status: 'active',
    provider: 'sandbox',
    providerSubscriptionId: 'sub_batch',
  });
  await store.setEntitlement({ userId: user.id, entitlement: 'adFree', active: true });
  const login = await service.login({ email, password: 'Correct Horse 123' });
  return login.cookie;
};

const urls = {
  youtube: 'https://www.youtube.com/watch?v=abc123',
  tiktok: 'https://www.tiktok.com/@creator/video/123',
  instagram: 'https://www.instagram.com/reel/ABC123/',
  reddit: 'https://www.reddit.com/r/test/comments/abc/title/',
  facebook: 'https://www.facebook.com/watch/?v=123',
  pinterest: 'https://www.pinterest.com/pin/123/',
  x: 'https://x.com/user/status/123',
};

test('Free batch allows one URL but blocks two URLs server-side', async () => {
  await withProxyEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, downloads: { videoHD: 'https://cdn.example/video.mp4' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const one = await request({ body: { urls: [urls.youtube] } });
    assert.equal(one.statusCode, 200);
    assert.equal(readJson(one).maxBatchUrls, 1);
    assert.equal(readJson(one).results.length, 1);

    const two = await request({ body: { urls: [urls.youtube, urls.tiktok], isPro: true } });
    const blocked = readJson(two);
    assert.equal(two.statusCode, 402);
    assert.equal(blocked.error.code, 'PRO_UPGRADE_REQUIRED');
    assert.equal(blocked.maxBatchUrls, 1);
  });
});

test('Pro batch allows seven mixed-platform URLs, rejects eight, and routes each platform', async () => {
  await withProxyEnv(async () => {
    const cookie = await makeProCookie();
    const forwarded = [];
    globalThis.fetch = async (target, init) => {
      forwarded.push({ target, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ success: true, media: [{ type: 'image', url: `https://cdn.example/${forwarded.length}.jpg` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const seven = Object.values(urls);
    const res = await request({ body: { urls: seven }, headers: { cookie } });
    const body = readJson(res);
    assert.equal(res.statusCode, 200);
    assert.equal(body.maxBatchUrls, 7);
    assert.equal(body.results.length, 7);
    assert.equal(body.results.every((entry) => entry.status === 'complete'), true);
    assert.deepEqual(forwarded.map((entry) => entry.target), [
      'https://render.example/youtube/download',
      'https://render.example/tiktok/download',
      'https://render.example/instagram/download',
      'https://render.example/reddit/download',
      'https://render.example/facebook/download',
      'https://render.example/pinterest/download',
      'https://render.example/twitter/download',
    ]);

    const eight = await request({ body: { urls: seven.concat('https://youtu.be/other') }, headers: { cookie } });
    assert.equal(eight.statusCode, 400);
    assert.equal(readJson(eight).error.code, 'BATCH_LIMIT_EXCEEDED');
  });
});

test('batch partial failures do not cancel successful URLs and retryFailed limits retries to failed URLs', async () => {
  await withProxyEnv(async () => {
    const cookie = await makeProCookie();
    const attempts = [];
    globalThis.fetch = async (target, init) => {
      const payload = JSON.parse(init.body);
      attempts.push(payload.url);
      if (payload.url === urls.instagram) {
        return new Response(JSON.stringify({ success: false, error_code: 'MEDIA_NOT_FOUND' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, media: [{ type: 'image', url: `${target}/image.jpg` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const first = await request({ body: { urls: [urls.youtube, urls.instagram, urls.reddit] }, headers: { cookie } });
    const firstBody = readJson(first);
    assert.equal(first.statusCode, 207);
    assert.deepEqual(firstBody.results.map((entry) => entry.status), ['complete', 'failed', 'complete']);
    assert.equal(firstBody.results.filter((entry) => entry.data?.media?.length).length, 2);

    attempts.length = 0;
    const retry = await request({
      body: { urls: [urls.youtube, urls.instagram, urls.reddit], retryFailed: true, failedUrls: [urls.instagram] },
      headers: { cookie },
    });
    const retryBody = readJson(retry);
    assert.equal(retry.statusCode, 207);
    assert.deepEqual(attempts, [urls.instagram]);
    assert.deepEqual(retryBody.results.map((entry) => entry.url), [urls.instagram]);
  });
});

test('malformed batch URLs are reported per link without cancelling valid links', async () => {
  await withProxyEnv(async () => {
    const cookie = await makeProCookie();
    const forwarded = [];
    globalThis.fetch = async (target, init) => {
      forwarded.push(JSON.parse(init.body).url);
      return new Response(JSON.stringify({ success: true, media: [{ type: 'video', url: `${target}/video.mp4` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({
      body: { urls: [urls.youtube, 'not-a-url', urls.tiktok] },
      headers: { cookie },
    });
    const body = readJson(res);

    assert.equal(res.statusCode, 207);
    assert.deepEqual(forwarded, [urls.youtube, urls.tiktok]);
    assert.deepEqual(body.results.map((entry) => entry.status), ['complete', 'failed', 'complete']);
    assert.equal(body.results[1].error.code, 'INVALID_URL');
  });
});

test('batch resolver concurrency is server-configurable but safely capped at three', async () => {
  await withProxyEnv(async () => {
    const cookie = await makeProCookie();
    let active = 0;
    let peak = 0;
    globalThis.fetch = async (target) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return new Response(JSON.stringify({ success: true, media: [{ type: 'image', url: `${target}/image.jpg` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await request({ body: { urls: Object.values(urls) }, headers: { cookie } });
    const body = readJson(res);

    assert.equal(res.statusCode, 200);
    assert.equal(body.concurrency, 3);
    assert.equal(peak, 3);
  }, { batchConcurrency: 99 });
});
