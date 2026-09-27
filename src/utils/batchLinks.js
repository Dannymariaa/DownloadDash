const URL_TOKEN_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

export const MAX_BATCH_URLS = 7;

export const splitBatchUrlInput = (value = '') => {
  const matches = String(value || '').match(URL_TOKEN_PATTERN) || [];
  const seen = new Set();
  const urls = [];

  for (const match of matches) {
    const clean = match.replace(/[),.;\]]+$/g, '').trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
  }

  return urls;
};

export const detectPlatformFromUrl = (url = '') => {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  if (hostname === 'youtu.be' || hostname.endsWith('youtube.com')) return 'youtube';
  if (hostname.endsWith('tiktok.com')) return 'tiktok';
  if (hostname.endsWith('instagram.com')) return 'instagram';
  if (hostname === 'fb.watch' || hostname.endsWith('facebook.com')) return 'facebook';
  if (hostname === 'pin.it' || hostname.endsWith('pinterest.com')) return 'pinterest';
  if (hostname === 'redd.it' || hostname.endsWith('reddit.com')) return 'reddit';
  if (hostname.endsWith('x.com') || hostname.endsWith('twitter.com')) return 'x';
  return null;
};

export const normalizeBatchUrls = (value = '', { maxUrls = MAX_BATCH_URLS } = {}) =>
  splitBatchUrlInput(value).slice(0, maxUrls).map((url) => ({
    url,
    platform: detectPlatformFromUrl(url),
  }));
