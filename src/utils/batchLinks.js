import { isPlatformMediaUrl, normalizePublicUrl } from '../../shared/publicUrl.js';

const URL_TOKEN_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

export const MAX_BATCH_URLS = 7;

export const splitBatchUrlInput = (value = '') => {
  const matches = String(value || '').match(URL_TOKEN_PATTERN) || [];
  const seen = new Set();
  const urls = [];

  for (const match of matches) {
    const normalized = normalizePublicUrl(match.replace(/[),.;\]]+$/g, '').trim(), { requireSupported: true });
    const clean = normalized.ok && isPlatformMediaUrl(normalized.url, normalized.platform) ? normalized.url : '';
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
  }

  return urls;
};

export const detectPlatformFromUrl = (url = '') => {
  const normalized = normalizePublicUrl(url, { requireSupported: true });
  return normalized.ok && isPlatformMediaUrl(normalized.url, normalized.platform) ? normalized.platform : null;
};

export const normalizeBatchUrls = (value = '', { maxUrls = MAX_BATCH_URLS } = {}) =>
  splitBatchUrlInput(value).slice(0, maxUrls).map((url) => ({
    url,
    platform: detectPlatformFromUrl(url),
  }));
