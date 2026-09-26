import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSelectableMediaItems,
  inferMediaTypeFromUrl,
  normalizeMediaItem,
  normalizeResolvedDownloads,
  responseErrorMessage,
} from '../../src/api/downloadDashClient.js';

test('client media type inference does not treat extensionless signed URLs as video', () => {
  assert.equal(inferMediaTypeFromUrl('https://cdn.example/photo?expires=1&sig=abc'), '');
  assert.equal(inferMediaTypeFromUrl('https://cdn.example/photo.jpg?expires=1'), 'image');
  assert.equal(inferMediaTypeFromUrl('https://cdn.example/video.mp4?expires=1'), 'video');
});

test('client normalizes extensionless image and video items from explicit metadata', () => {
  const image = normalizeMediaItem({
    type: 'image',
    url: 'https://cdn.example/signed-image?sig=abc',
    mimeType: 'image/jpeg',
    width: 1080,
    height: 1350,
  }, 0);

  const video = normalizeMediaItem({
    is_video: true,
    video_url: 'https://cdn.example/signed-video?sig=abc',
    display_url: 'https://cdn.example/video-thumb.jpg',
    contentType: 'video/mp4',
    has_audio: true,
    audio_url: 'https://cdn.example/audio.m4a',
  }, 1);

  assert.equal(image.type, 'image');
  assert.equal(image.format, 'jpg');
  assert.equal(image.thumbnail, image.url);
  assert.equal(video.type, 'video');
  assert.equal(video.url, 'https://cdn.example/signed-video?sig=abc');
  assert.equal(video.thumbnail, 'https://cdn.example/video-thumb.jpg');
  assert.equal(video.hasAudio, true);
  assert.equal(video.audioUrl, 'https://cdn.example/audio.m4a');
});

test('client leaves unknown signed media unknown and does not use thumbnails as primary media', () => {
  const unknown = normalizeMediaItem({
    url: 'https://cdn.example/opaque?sig=abc',
    thumbnail: 'https://cdn.example/thumb.jpg',
  }, 0);

  const video = normalizeMediaItem({
    type: 'video',
    videoUrl: 'https://cdn.example/video?sig=abc',
    thumbnail: 'https://cdn.example/thumb.jpg',
  }, 1);

  assert.equal(unknown.type, 'unknown');
  assert.equal(unknown.url, 'https://cdn.example/opaque?sig=abc');
  assert.equal(video.type, 'video');
  assert.equal(video.url, 'https://cdn.example/video?sig=abc');
  assert.notEqual(video.url, video.thumbnail);
});

test('client normalizes media aliases without turning unknown items into photos', () => {
  const items = [
    normalizeMediaItem({ type: 'photo', url: 'https://cdn.example/1' }, 0),
    normalizeMediaItem({ type: 'picture', url: 'https://cdn.example/2' }, 1),
    normalizeMediaItem({ type: 'reel', url: 'https://cdn.example/3' }, 2),
    normalizeMediaItem({ type: 'sound', url: 'https://cdn.example/4' }, 3),
    normalizeMediaItem({ type: 'mystery', url: 'https://cdn.example/5', thumbnail: 'https://cdn.example/t.jpg' }, 4),
  ];

  assert.deepEqual(items.map((item) => item.type), ['image', 'image', 'video', 'audio', 'unknown']);
  assert.deepEqual(getSelectableMediaItems(items).map((item) => item.id), ['media-0', 'media-1', 'media-2', 'media-3']);
});

test('client classifies mixed multi-media posts as albums and keeps stable selected ids', () => {
  const normalized = normalizeResolvedDownloads({
    type: 'video',
    downloads: {
      items: [
        { type: 'image', url: 'https://cdn.example/01.jpg' },
        { type: 'video', url: 'https://cdn.example/02.mp4', thumbnail: 'https://cdn.example/02.jpg', hasAudio: true },
        { type: 'unknown', url: 'https://cdn.example/page' },
        { type: 'image', url: 'https://cdn.example/03.jpg' },
      ],
    },
  });

  assert.equal(normalized.type, 'album');
  assert.deepEqual(normalized.downloads.items.map((item) => item.id), ['media-0', 'media-1', 'media-2', 'media-3']);
  assert.deepEqual(getSelectableMediaItems(normalized.downloads.items).map((item) => item.id), ['media-0', 'media-1', 'media-3']);
});

test('client keeps video quality variants inside one selectable source item', () => {
  const normalized = normalizeResolvedDownloads({
    type: 'video',
    downloads: {
      videoHD: 'https://cdn.example/video-1080.mp4',
      videoSD: 'https://cdn.example/video-480.mp4',
      audio: 'https://cdn.example/audio.m4a',
      items: [
        {
          id: 'media-0',
          type: 'video',
          url: 'https://cdn.example/video-1080.mp4',
          variants: [
            { url: 'https://cdn.example/video-1080.mp4', height: 1080 },
            { url: 'https://cdn.example/video-480.mp4', height: 480 },
          ],
        },
        {
          id: 'media-1',
          type: 'audio',
          url: 'https://cdn.example/audio.m4a',
        },
      ],
    },
  });

  assert.equal(normalized.type, 'video');
  assert.deepEqual(normalized.downloads.items.map((item) => item.type), ['video', 'audio']);
  assert.deepEqual(getSelectableMediaItems(normalized.downloads.items).map((item) => item.id), ['media-0', 'media-1']);
  assert.equal(normalized.downloads.videoHD, 'https://cdn.example/video-1080.mp4');
  assert.equal(normalized.downloads.videoSD, 'https://cdn.example/video-480.mp4');
  assert.equal(normalized.downloads.audio, 'https://cdn.example/audio.m4a');
  assert.deepEqual(normalized.downloads.items[0].variants.map((variant) => variant.height), [1080, 480]);
});

test('client maps backend downloader error codes to user-safe messages', () => {
  const cases = [
    ['MEDIA_NOT_FOUND', 'Media was not found or is no longer available.'],
    ['PRIVATE_MEDIA', 'This media is private, restricted, or unavailable.'],
    ['LOGIN_REQUIRED', 'X is currently requiring an authenticated session for this media. Please try again later.'],
    ['COOKIE_REQUIRED', 'This media currently requires an authenticated platform session. Please try again later.'],
    ['COOKIE_EXPIRED', 'This media currently requires a refreshed platform session. Please try again later.'],
    ['ANTI_BOT_CHALLENGE', 'Facebook temporarily blocked access to this public post. Try again later or try another public link.'],
    ['PLATFORM_BLOCKED_PROXY', 'The platform temporarily blocked this request. Please try again later.'],
    ['PROXY_BLOCKED', 'The download service is temporarily blocked by the platform. Please try again later.'],
    ['RATE_LIMITED', 'Too many requests. Please try again later.'],
    ['EXTRACTOR_OUTDATED', 'This media cannot be resolved right now. Please try again later.'],
    ['EXTRACTOR_FAILED', 'This media could not be resolved right now. Please try again later.'],
    ['UPSTREAM_TIMEOUT', 'The download service is temporarily unavailable. Please try again shortly.'],
    ['UPSTREAM_UNAVAILABLE', 'The download service is temporarily unavailable. Please try again shortly.'],
    ['UPSTREAM_PROXY_FAILED', 'The download service is temporarily unavailable. Please try again shortly.'],
    ['UPSTREAM_ROUTE_NOT_FOUND', 'The download service is temporarily unavailable. Please try again shortly.'],
    ['UNSUPPORTED_MEDIA', 'This media is not supported for download.'],
  ];

  for (const [code, expected] of cases) {
    assert.equal(
      responseErrorMessage({
        error: {
          code,
          message: 'raw provider text account locked cookies.txt authorization Bearer secret',
        },
      }, 'Download failed'),
      expected,
      code
    );
  }
});
