import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://api.downloaddash.store';

export const getApiBaseUrl = () => {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const raw = extra.apiBaseUrl || DEFAULT_API_BASE_URL;
  return String(raw).replace(/\/+$/, '');
};

const getApiHeaders = () => {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const headers = {
    'Content-Type': 'application/json',
  };

  if (extra.requireApiKey && extra.apiKey && extra.apiKey !== 'your_api_key_here') {
    headers['X-API-Key'] = String(extra.apiKey).trim();
  }

  return headers;
};

const absolutizeUrl = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/')) return `${getApiBaseUrl()}/${value.replace(/^\/+/, '')}`;
  return `${getApiBaseUrl()}${value}`;
};

export const detectPlatform = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) return 'facebook';
    if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) return 'pinterest';
    if (hostname.includes('reddit.com') || hostname.includes('redd.it')) return 'reddit';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('t.me') || hostname.includes('telegram.me') || hostname.includes('telegram.org')) return 'telegram';
    return null;
  } catch {
    return null;
  }
};

const mapQuality = (quality) => {
  if (quality === 'low') return 'low';
  if (quality === 'medium') return 'medium';
  return 'high';
};

const normalizeDownloads = (data) => {
  const downloads = { ...(data?.downloads || {}) };

  if (!downloads.videoHD && downloads.video) downloads.videoHD = downloads.video;
  if (!downloads.videoSD && downloads.video) downloads.videoSD = downloads.video;
  if (!downloads.audio && downloads.audio_url) downloads.audio = downloads.audio_url;
  if (!downloads.items && Array.isArray(downloads.images)) downloads.items = downloads.images;
  if (!downloads.image && data?.media_info?.download_url && data?.media_info?.media_type === 'image') {
    downloads.image = data.media_info.download_url;
  }

  const items = Array.isArray(downloads.items)
    ? downloads.items
        .map((item, index) => {
          const entry = typeof item === 'string' ? { url: item } : item;
          return {
            url: absolutizeUrl(entry.url || entry.download_url),
            type: entry.type || entry.media_type || 'image',
            index,
          };
        })
        .filter((item) => item.url)
    : [];

  return {
    videoHD: absolutizeUrl(downloads.videoHD),
    videoSD: absolutizeUrl(downloads.videoSD),
    audio: absolutizeUrl(downloads.audio),
    image: absolutizeUrl(downloads.image),
    items,
    fallback: absolutizeUrl(
      data?.download_url ||
        data?.media_info?.download_url ||
        data?.media_info?.preview_url ||
        data?.media_info?.thumbnail_url
    ),
  };
};

export const resolveDownload = async ({ url, quality = 'high', extractAudio = false }) => {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error('Paste a supported YouTube, Instagram, TikTok, Facebook, Pinterest, Reddit, X, or Telegram link.');
  }

  const response = await fetch(`${getApiBaseUrl()}/${platform}/download`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify({
      url,
      quality: mapQuality(quality),
      extract_audio: extractAudio,
      include_metadata: true,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.error || data?.message || `Request failed (${response.status})`);
  }

  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'Download resolve failed.');
  }

  const downloads = normalizeDownloads(data);
  const primaryUrl =
    (extractAudio ? downloads.audio : null) ||
    downloads.videoHD ||
    downloads.videoSD ||
    downloads.image ||
    downloads.audio ||
    downloads.fallback;

  return {
    platform,
    title: data?.media_info?.title || 'DownloadDash Media',
    mediaType: data?.media_info?.media_type || 'video',
    thumbnailUrl: absolutizeUrl(data?.media_info?.thumbnail_url || data?.media_info?.preview_url),
    sourceUrl: url,
    downloads,
    primaryUrl,
  };
};
