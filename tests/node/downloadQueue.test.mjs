import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  downloadItemsWithQueue,
  downloadItemsSequentially,
  filenameFromMediaItem,
  mediaQueueLabel,
} from '../../src/utils/downloadQueue.js';

test('five images are downloaded as five individual files without ZIP generation', async () => {
  const calls = [];
  const items = Array.from({ length: 5 }, (_, index) => ({
    type: 'image',
    url: `https://cdn.example/photo-${index + 1}.jpg`,
  }));

  const result = await downloadItemsSequentially({
    items,
    platform: 'instagram',
    downloadOne: async (item, filename) => calls.push({ url: item.url, filename }),
    delayMs: 0,
  });

  assert.equal(result.completed.length, 5);
  assert.equal(result.failed.length, 0);
  assert.deepEqual(calls.map((call) => call.filename), [
    'Photo 1.jpg',
    'Photo 2.jpg',
    'Photo 3.jpg',
    'Photo 4.jpg',
    'Photo 5.jpg',
  ]);
  assert.doesNotMatch(JSON.stringify(result), /\.zip|application\/zip|zip/i);
});

test('three selected from five are downloaded individually in the selected order', async () => {
  const calls = [];
  const items = [
    { id: 'one', index: 0, type: 'image', url: 'https://cdn.example/one.png' },
    { id: 'three', index: 2, type: 'image', url: 'https://cdn.example/three.webp' },
    { id: 'five', index: 4, type: 'image', url: 'https://cdn.example/five.jpeg' },
  ];

  await downloadItemsSequentially({
    items,
    platform: 'tiktok',
    downloadOne: async (item, filename) => calls.push({ id: item.id, filename }),
    delayMs: 0,
  });

  assert.deepEqual(calls, [
    { id: 'one', filename: 'Photo 1.png' },
    { id: 'three', filename: 'Photo 3.webp' },
    { id: 'five', filename: 'Photo 5.jpeg' },
  ]);
});

test('selected seven from twenty preserve source ids and download exactly seven native files', async () => {
  const calls = [];
  const allItems = Array.from({ length: 20 }, (_, index) => ({
    id: `media-${index}`,
    index,
    type: 'image',
    url: `https://cdn.example/photo-${index + 1}.webp`,
    mimeType: 'image/webp',
  }));
  const selected = [1, 4, 8, 9, 13, 17, 19].map((index) => allItems[index]);

  const result = await downloadItemsSequentially({
    items: selected,
    platform: 'instagram',
    downloadOne: async (item, filename) => calls.push({ id: item.id, url: item.url, filename }),
    delayMs: 0,
  });

  assert.equal(result.requested, 7);
  assert.equal(result.completed.length, 7);
  assert.equal(result.failed.length, 0);
  assert.deepEqual(calls.map((call) => call.id), ['media-1', 'media-4', 'media-8', 'media-9', 'media-13', 'media-17', 'media-19']);
  assert.deepEqual(calls.map((call) => call.filename), [
    'Photo 2.webp',
    'Photo 5.webp',
    'Photo 9.webp',
    'Photo 10.webp',
    'Photo 14.webp',
    'Photo 18.webp',
    'Photo 20.webp',
  ]);
  assert.doesNotMatch(JSON.stringify({ result, calls }), /\.zip|application\/zip|zip/i);
});

test('twenty image carousel downloads as twenty individual native files', async () => {
  const calls = [];
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `photo-${index + 1}`,
    index,
    type: 'image',
    url: `https://cdn.example/photo-${index + 1}.avif`,
    mimeType: 'image/avif',
  }));

  const result = await downloadItemsSequentially({
    items,
    platform: 'reddit',
    downloadOne: async (item, filename) => calls.push({ url: item.url, filename }),
    delayMs: 0,
  });

  assert.equal(result.completed.length, 20);
  assert.equal(calls.length, 20);
  assert.equal(calls[0].filename, 'Photo 1.avif');
  assert.equal(calls.at(-1).filename, 'Photo 20.avif');
  assert.doesNotMatch(JSON.stringify({ result, calls }), /\.zip|application\/zip|zip/i);
});

test('mixed image video and audio files preserve their media extensions', async () => {
  const calls = [];
  const items = [
    { type: 'image', url: 'https://cdn.example/image?id=1', mimeType: 'image/avif' },
    { type: 'video', url: 'https://cdn.example/video.webm?sig=secret' },
    { type: 'audio', url: 'https://cdn.example/sound', format: 'm4a' },
  ];

  await downloadItemsSequentially({
    items,
    platform: 'mixed',
    downloadOne: async (item, filename) => calls.push(filename),
    delayMs: 0,
  });

  assert.deepEqual(calls, ['Photo 1.avif', 'Video 2.webm', 'Audio.m4a']);
});

test('duplicate source items are not downloaded twice', async () => {
  const calls = [];
  const items = [
    { type: 'image', url: 'https://cdn.example/dup.jpg' },
    { type: 'image', url: 'https://cdn.example/dup.jpg' },
    { type: 'audio', url: 'https://cdn.example/dup.jpg' },
  ];

  const result = await downloadItemsSequentially({
    items,
    platform: 'reddit',
    downloadOne: async (item, filename) => calls.push({ type: item.type, filename }),
    delayMs: 0,
  });

  assert.equal(result.requested, 3);
  assert.equal(result.skippedDuplicates, 1);
  assert.equal(result.completed.length, 2);
  assert.deepEqual(calls.map((call) => call.type), ['image', 'audio']);
});

test('failed individual downloads are reported safely without signed URLs', async () => {
  const items = [
    { type: 'image', url: 'https://cdn.example/ok.jpg' },
    { type: 'video', url: 'https://signed.example/fail.mp4?token=secret-token' },
    { type: 'audio', url: 'https://cdn.example/ok.m4a' },
  ];

  const result = await downloadItemsSequentially({
    items,
    platform: 'instagram',
    downloadOne: async (item) => {
      if (item.type === 'video') throw new Error(`403 ${item.url}`);
    },
    delayMs: 0,
  });

  assert.equal(result.completed.length, 2);
  assert.equal(result.failed.length, 1);
  assert.equal(result.summary, '2 downloads completed, 1 failed.');
  assert.deepEqual(result.failed, [{ index: 1, label: 'Video 2', filename: 'Video 2.mp4', error: 'Download failed' }]);
  assert.doesNotMatch(JSON.stringify(result), /secret-token|signed\.example|403/);
});

test('filename helper keeps explicit safe filenames and maps MIME formats correctly', () => {
  assert.equal(filenameFromMediaItem({ type: 'image', filename: 'Creator Photo.webp' }, 'x', 0), 'Creator Photo.webp');
  assert.equal(filenameFromMediaItem({ type: 'image', url: 'https://cdn.example/file', mimeType: 'image/jpeg' }, 'x', 0), 'Photo 1.jpg');
  assert.equal(filenameFromMediaItem({ type: 'audio', url: 'https://cdn.example/file', mimeType: 'audio/aac' }, 'x', 0), 'Audio.aac');
});

test('video quality queue labels expose HD and SD batch actions', () => {
  assert.equal(mediaQueueLabel({ type: 'video', quality: 'hd' }, 0), 'HD');
  assert.equal(mediaQueueLabel({ type: 'video', quality: 'sd' }, 0), 'SD');
  assert.equal(mediaQueueLabel({ type: 'video', height: 1080 }, 0), 'HD');
  assert.equal(mediaQueueLabel({ type: 'video', height: 480 }, 0), 'SD');
});

test('download queue reports waiting downloading completed failed and retryable states without duplicates', async () => {
  const snapshots = [];
  const items = [
    { type: 'image', url: 'https://cdn.example/one.jpg' },
    { type: 'image', url: 'https://cdn.example/two.jpg' },
    { type: 'image', url: 'https://cdn.example/two.jpg' },
    { type: 'video', url: 'https://cdn.example/fail.mp4' },
  ];

  const result = await downloadItemsWithQueue({
    items,
    platform: 'instagram',
    concurrency: 2,
    delayMs: 0,
    onProgress: (queue) => snapshots.push(queue.map((entry) => entry.status)),
    downloadOne: async (item) => {
      if (item.url.includes('fail')) throw new Error('network');
    },
  });

  assert.equal(result.requested, 4);
  assert.equal(result.skippedDuplicates, 1);
  assert.equal(result.completed.length, 2);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(result.queue.map((entry) => entry.status), ['completed', 'completed', 'skipped', 'failed']);
  assert.deepEqual(result.queue.map((entry) => entry.retryable), [false, false, false, true]);
  assert.ok(snapshots.some((statuses) => statuses.includes('waiting')));
  assert.ok(snapshots.some((statuses) => statuses.includes('downloading')));
});
