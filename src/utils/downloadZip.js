import { buildStoredZip } from './zip.js';

const getDownloadExtension = (type, urlValue = '') => {
  const cleanUrl = String(urlValue || '').split('?')[0].toLowerCase();
  const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/);
  if (match) return match[1];
  if (type === 'audio') return 'mp3';
  if (type === 'image' || type === 'album' || type === 'zip') return 'jpg';
  return 'mp4';
};

export const zipMediaType = (item = {}) =>
  item.type === 'video' ? 'video' : item.type === 'audio' ? 'audio' : 'image';

export const mediaDisplayLabel = (item = {}, index = 0) => {
  if (item.type === 'audio') return 'Audio';
  const type = item.type === 'video' ? 'Video' : 'Photo';
  return `${type} ${index + 1}`;
};

export const zipFilenameFromItem = (item = {}, platform = 'media', index = 0) => {
  if (item.filename) {
    const extension = String(item.filename).split('.').pop();
    if (extension && extension.length <= 5) return item.filename;
  }
  const type = zipMediaType(item);
  const extension = item.format || item.extension || getDownloadExtension(type, item.url);
  return `DownloadDash-${platform}-${String(index + 1).padStart(2, '0')}.${extension}`;
};

const safeFailure = (item, platform, index) => ({
  index,
  label: mediaDisplayLabel(item, index),
  filename: zipFilenameFromItem(item, platform, index),
  error: 'Download failed',
});

export const prepareZipDownload = async ({
  items = [],
  platform = 'media',
  sourceUrl = '',
  fetchMediaBlob,
}) => {
  const files = [];
  const failed = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemType = zipMediaType(item);
    const filename = zipFilenameFromItem(item, platform, index);

    try {
      const blob = await fetchMediaBlob(item.url, sourceUrl, itemType);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      files.push({ name: filename, bytes });
    } catch {
      failed.push(safeFailure(item, platform, index));
    }
  }

  const blob = files.length ? buildStoredZip(files) : null;
  const failedLabels = failed.map((item) => item.label).join(', ');
  const failureMessage = failed.length
    ? `Downloaded ${files.length} ${files.length === 1 ? 'file' : 'files'}. ${failed.length} ${failed.length === 1 ? 'item' : 'items'} could not be fetched: ${failedLabels}.`
    : '';

  return { blob, files, failed, failureMessage };
};
