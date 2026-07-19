import downloadDash from '@/api/downloadDashClient';

const PLATFORM_ALIASES = {
  x: 'twitter',
};

const normalizePlatform = (platform = 'instagram') =>
  PLATFORM_ALIASES[String(platform).toLowerCase()] || String(platform).toLowerCase();

export const downloadFromUrl = async (url, options = {}) => {
  const {
    platform = 'instagram',
    quality = 'high',
    extractAudio = false,
  } = options;

  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }

  return downloadDash.download(normalizePlatform(platform), {
    url: url.trim(),
    quality,
    extractAudio,
  });
};

export const saveToGallery = async (mediaUrl, filename, options = {}) => {
  if (!mediaUrl) {
    throw new Error('No media URL provided');
  }

  const { platform = 'instagram', mediaType = 'auto', sourceUrl = '' } = options;
  return downloadDash.downloadToDevice(mediaUrl, filename, sourceUrl, mediaType || platform);
};

export const saveMultipleToGallery = async (items, platform = 'instagram') => {
  const results = { success: [], failed: [], total: items.length };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    try {
      await saveToGallery(item.url, item.filename, { platform, mediaType: item.type });
      results.success.push({ index, filename: item.filename });
    } catch (error) {
      results.failed.push({ index, url: item.url, error: error.message });
    }
  }

  return results;
};

export const validateDownloadUrl = (url, platform = 'instagram') => {
  if (!url || typeof url !== 'string') return { valid: false, error: 'URL is required' };

  const trimmedUrl = url.trim();
  if (trimmedUrl.length < 10) return { valid: false, error: 'URL is too short' };

  try {
    new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  const patterns = {
    instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+/i,
    facebook: /^https?:\/\/(www\.|m\.)?(facebook\.com|fb\.watch|fb\.me|fb\.gg)\/.+/i,
    tiktok: /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    youtube: /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/.+/i,
    twitter: /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+/i,
    x: /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+/i,
    pinterest: /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.com|pin\.it)\/.+/i,
    reddit: /^https?:\/\/(www\.)?(reddit\.com|redd\.it)\/.+/i,
  };

  const normalizedPlatform = normalizePlatform(platform);
  const pattern = patterns[String(platform).toLowerCase()] || patterns[normalizedPlatform];
  if (pattern && !pattern.test(trimmedUrl)) {
    return { valid: false, error: `Please enter a valid ${platform} URL` };
  }

  return { valid: true, url: trimmedUrl };
};

export const batchDownload = async (urls, options = {}) => {
  const results = [];

  for (let index = 0; index < urls.length; index += 1) {
    try {
      const result = await downloadFromUrl(urls[index], options);
      results.push({ success: true, index, data: result });
    } catch (error) {
      results.push({ success: false, index, error: error.message });
    }
  }

  return results;
};

const detectPlatform = (url) => {
  const patterns = {
    youtube: /youtube\.com|youtu\.be/i,
    instagram: /instagram\.com|instagr\.am/i,
    tiktok: /tiktok\.com/i,
    facebook: /facebook\.com|fb\.watch|fb\.me|fb\.gg/i,
    pinterest: /pinterest\.com|pin\.it/i,
    reddit: /reddit\.com|redd\.it/i,
    twitter: /twitter\.com|x\.com/i,
    telegram: /t\.me|telegram\./i,
  };

  return Object.entries(patterns).find(([, pattern]) => pattern.test(url))?.[0] || null;
};

const downloader = {
  download: downloadFromUrl,
  saveToGallery,
  saveMultiple: saveMultipleToGallery,
  validate: validateDownloadUrl,
  batch: batchDownload,
  auth: downloadDash.auth,
  detectPlatform,
  resolveViaApi: downloadFromUrl,
};

export default downloader;
