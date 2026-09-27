const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus']);

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
};

const DEFAULT_EXTENSION_BY_TYPE = {
  image: 'jpg',
  video: 'mp4',
  audio: 'mp3',
};

const wait = (delayMs) =>
  delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();

export const normalizeQueueMediaType = (type = '') => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'photo' || normalized === 'picture' || normalized === 'img') return 'image';
  if (normalized === 'sound' || normalized === 'music') return 'audio';
  if (normalized === 'video' || normalized === 'image' || normalized === 'audio') return normalized;
  return 'unknown';
};

export const extensionFromMediaItem = (item = {}) => {
  const explicit = String(item.extension || item.format || '').toLowerCase().replace(/^\./, '');
  if (explicit) return explicit;

  const mimeType = String(item.mimeType || item.mime_type || item.contentType || item.content_type || '')
    .toLowerCase()
    .split(';')[0]
    .trim();
  if (EXTENSION_BY_MIME[mimeType]) return EXTENSION_BY_MIME[mimeType];

  const urlPath = String(item.url || '').split('?')[0].toLowerCase();
  const match = urlPath.match(/\.([a-z0-9]{2,5})$/);
  if (match) return match[1];

  const type = normalizeQueueMediaType(item.type);
  return DEFAULT_EXTENSION_BY_TYPE[type] || 'bin';
};

const sanitizeFilename = (name) =>
  String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

const sourcePosition = (item = {}, fallbackIndex = 0) => {
  const value = Number.isInteger(item.index) ? item.index : fallbackIndex;
  return value + 1;
};

export const mediaQueueLabel = (item = {}, index = 0) => {
  const type = normalizeQueueMediaType(item.type);
  if (type === 'audio') return 'Audio';
  if (type === 'video') {
    const quality = String(item.quality || item.label || '').toLowerCase();
    const height = Number(item.height || 0);
    if (quality.includes('sd') || (height > 0 && height <= 576)) return 'SD';
    if (quality.includes('hd') || quality.includes('best') || height >= 720) return 'HD';
    return `Video ${sourcePosition(item, index)}`;
  }
  return `Photo ${sourcePosition(item, index)}`;
};

const extensionMatchesType = (type, extension) => {
  if (type === 'image') return IMAGE_EXTENSIONS.has(extension);
  if (type === 'video') return VIDEO_EXTENSIONS.has(extension);
  if (type === 'audio') return AUDIO_EXTENSIONS.has(extension);
  return true;
};

export const filenameFromMediaItem = (item = {}, platform = 'media', index = 0) => {
  const explicit = sanitizeFilename(item.filename || item.file_name);
  if (explicit && /\.[a-z0-9]{2,5}$/i.test(explicit)) return explicit;

  const type = normalizeQueueMediaType(item.type);
  const extension = extensionFromMediaItem(item);
  const safeExtension = extensionMatchesType(type, extension)
    ? extension
    : DEFAULT_EXTENSION_BY_TYPE[type] || extension || 'bin';
  return `${mediaQueueLabel(item, index)}.${safeExtension}`;
};

const itemIdentity = (item = {}) => `${normalizeQueueMediaType(item.type)}:${item.url || ''}`;

const safeFailure = (item, platform, index) => ({
  index,
  label: mediaQueueLabel(item, index),
  filename: filenameFromMediaItem(item, platform, index),
  error: 'Download failed',
});

export const summarizeDownloadQueue = ({ completed = [], failed = [] } = {}) => {
  if (!completed.length && !failed.length) return 'No downloads were started.';
  if (!failed.length) {
    return `${completed.length} ${completed.length === 1 ? 'download' : 'downloads'} completed.`;
  }
  return `${completed.length} ${completed.length === 1 ? 'download' : 'downloads'} completed, ${failed.length} failed.`;
};

const cloneQueue = (queue) => queue.map((entry) => ({ ...entry }));

export const downloadItemsWithQueue = async ({
  items = [],
  platform = 'media',
  downloadOne,
  delayMs = 650,
  concurrency = 2,
  onProgress,
} = {}) => {
  if (typeof downloadOne !== 'function') {
    throw new Error('downloadOne is required');
  }

  const completed = [];
  const failed = [];
  const seen = new Set();
  let skippedDuplicates = 0;
  const queue = items.map((item, index) => ({
    index,
    item,
    label: mediaQueueLabel(item, index),
    filename: filenameFromMediaItem(item, platform, index),
    status: item?.url ? 'waiting' : 'skipped',
    retryable: false,
  }));
  const emit = () => {
    if (typeof onProgress === 'function') onProgress(cloneQueue(queue));
  };

  emit();

  const runnable = [];
  queue.forEach((entry) => {
    if (!entry.item?.url) return;
    const identity = itemIdentity(entry.item);
    if (seen.has(identity)) {
      entry.status = 'skipped';
      skippedDuplicates += 1;
      return;
    }
    seen.add(identity);
    runnable.push(entry);
  });
  emit();

  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, Number(concurrency) || 1), 3, runnable.length || 1);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < runnable.length) {
      const entry = runnable[nextIndex];
      nextIndex += 1;
      entry.status = 'downloading';
      emit();
      try {
        await downloadOne(entry.item, entry.filename, entry.index);
        entry.status = 'completed';
        completed.push({ index: entry.index, label: entry.label, filename: entry.filename });
      } catch {
        entry.status = 'failed';
        entry.retryable = true;
        failed.push(safeFailure(entry.item, platform, entry.index));
      }
      emit();
      await wait(delayMs);
    }
  }));

  return {
    requested: items.length,
    completed,
    failed,
    skippedDuplicates,
    queue: cloneQueue(queue).map(({ item: _item, ...entry }) => entry),
    summary: summarizeDownloadQueue({ completed, failed }),
    multipleDownloadNotice:
      completed.length + failed.length > 1
        ? 'Your browser may ask you to allow multiple downloads from DownloadDash.'
        : '',
  };
};

export const downloadItemsSequentially = async ({
  items = [],
  platform = 'media',
  downloadOne,
  delayMs = 650,
} = {}) => {
  if (typeof downloadOne !== 'function') {
    throw new Error('downloadOne is required');
  }

  const completed = [];
  const failed = [];
  const seen = new Set();
  let skippedDuplicates = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item?.url) continue;

    const identity = itemIdentity(item);
    if (seen.has(identity)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(identity);

    const filename = filenameFromMediaItem(item, platform, index);
    try {
      await downloadOne(item, filename, index);
      completed.push({ index, label: mediaQueueLabel(item, index), filename });
    } catch {
      failed.push(safeFailure(item, platform, index));
    }

    if (index < items.length - 1) await wait(delayMs);
  }

  return {
    requested: items.length,
    completed,
    failed,
    skippedDuplicates,
    summary: summarizeDownloadQueue({ completed, failed }),
    multipleDownloadNotice:
      completed.length + failed.length > 1
        ? 'Your browser may ask you to allow multiple downloads from DownloadDash.'
        : '',
  };
};
