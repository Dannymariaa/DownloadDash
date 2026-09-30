import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectPlatformFromUrl, normalizeBatchUrls, splitBatchUrlInput } from '../../src/utils/batchLinks.js';

test('multiline batch paste splits, trims, and deduplicates public media URLs', () => {
  const input = `
    https://www.youtube.com/watch?v=abc123
    https://www.tiktok.com/@creator/video/123
    https://www.youtube.com/watch?v=abc123
    text https://www.instagram.com/p/ABC123/,
  `;

  assert.deepEqual(splitBatchUrlInput(input), [
    'https://www.youtube.com/watch?v=abc123',
    'https://www.tiktok.com/@creator/video/123',
    'https://www.instagram.com/p/ABC123/',
  ]);
});

test('batch URL normalization detects mixed supported platforms and caps at seven unique URLs', () => {
  const input = [
    'https://www.youtube.com/watch?v=abc123',
    'https://youtu.be/abc123',
    'https://www.tiktok.com/@creator/video/123',
    'https://www.instagram.com/reel/ABC123/',
    'https://www.facebook.com/watch/?v=123',
    'https://www.reddit.com/r/test/comments/abc/title/',
    'https://www.pinterest.com/pin/123/',
    'https://x.com/user/status/123',
  ].join('\n');

  assert.deepEqual(normalizeBatchUrls(input).map((entry) => entry.platform), [
    'youtube',
    'youtube',
    'tiktok',
    'instagram',
    'facebook',
    'reddit',
    'pinterest',
  ]);
});

test('batch platform detection covers standard supported public URL forms', () => {
  assert.equal(detectPlatformFromUrl('https://www.youtube.com/shorts/abc123'), 'youtube');
  assert.equal(detectPlatformFromUrl('https://www.youtube.com/live/abc123'), 'youtube');
  assert.equal(detectPlatformFromUrl('https://youtu.be/abc123'), 'youtube');
  assert.equal(detectPlatformFromUrl('https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3'), 'reddit');
  assert.equal(detectPlatformFromUrl('https://twitter.com/user/status/123'), 'x');
  assert.equal(detectPlatformFromUrl('https://pin.it/abc123'), 'pinterest');
  assert.equal(detectPlatformFromUrl('https://example.com/nope'), null);
  assert.equal(detectPlatformFromUrl('https://www.reddit.com/r/nigerianfood/'), null);
});
