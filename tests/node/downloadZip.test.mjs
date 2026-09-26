import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareZipDownload } from '../../src/utils/downloadZip.js';

test('selected ZIP downloads keep successful files and report failed items safely', async () => {
  const items = [
    { id: 'one', type: 'image', url: 'https://cdn.example/one.jpg', filename: 'one.jpg' },
    { id: 'two', type: 'video', url: 'https://signed.example/two.mp4?token=secret-token' },
    { id: 'three', type: 'audio', url: 'https://cdn.example/three.m4a', filename: 'three.m4a' },
  ];

  const result = await prepareZipDownload({
    items,
    platform: 'instagram',
    sourceUrl: 'https://www.instagram.com/p/example/',
    fetchMediaBlob: async (url) => {
      if (url.includes('two.mp4')) throw new Error('403 signed URL failed token=secret-token');
      return new Blob([new Uint8Array([1, 2, 3])]);
    },
  });

  assert.equal(result.files.length, 2);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(result.failed, [
    {
      index: 1,
      label: 'Video 2',
      filename: 'DownloadDash-instagram-02.mp4',
      error: 'Download failed',
    },
  ]);
  assert.equal(result.failureMessage, 'Downloaded 2 files. 1 item could not be fetched: Video 2.');
  assert.doesNotMatch(JSON.stringify(result), /secret-token|signed\.example|403 signed URL/);
});
