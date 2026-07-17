// @ts-nocheck
// src/api/downloadDashClient.js

const DEFAULT_API_BASE_URL = '/api';  // Changed from '/api/smd'
const PROTECTED_RENDER_API_HOSTS = new Set([
  'api.downloaddash.store',
]);

// --- FIX: Platform mapping for consistent API routing ---
const PLATFORM_MAP = {
  'youtube': 'youtube',
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'facebook': 'facebook',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'x': 'twitter',  // Map x to twitter for backend
  'twitter': 'twitter',
  'telegram': 'telegram',
  'whatsappbusiness': 'whatsapp_business',
  'whatsapp_business': 'whatsapp_business'
};

const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_SMD_API_BASE_URL || DEFAULT_API_BASE_URL;
  const normalized = String(raw).replace(/\/+$/, '') || DEFAULT_API_BASE_URL;

  if (normalized === '/api') return DEFAULT_API_BASE_URL;

  try {
    const parsed = new URL(normalized);
    if (PROTECTED_RENDER_API_HOSTS.has(parsed.hostname.toLowerCase())) {
      return DEFAULT_API_BASE_URL;
    }
  } catch {
    // Relative URLs are expected for the Vercel serverless proxy.
  }

  return normalized;
};

const useRapidApiForYoutube = () => {
  const flag = String(import.meta.env.VITE_USE_RAPIDAPI_YOUTUBE || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
};

const absolutizeApiUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('/')) return url;
  return `${getApiBaseUrl()}${url}`;
};

// --- FIX: Build headers with API key ---
const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  
  // Get API key from environment
  const apiKey = import.meta.env.DOWNLOADDASH_API_KEY || 
                 import.meta.env.VITE_DOWNLOADDASH_API_KEY || 
                 '';
  
  if (apiKey && apiKey.trim() !== '') {
    headers['X-API-Key'] = apiKey.trim();
    headers['X-DownloadDash-Key'] = apiKey.trim();
    headers['DOWNLOADDASH_API_KEY'] = apiKey.trim();
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  
  return headers;
};

const tryParseJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const getResponseMessage = async (res, fallback) => {
  const data = await tryParseJson(res);
  return data?.detail || data?.error || data?.message || fallback;
};

// --- FIX: Improved postJson with better error handling ---
const postJson = async (path, body) => {
  const baseUrl = getApiBaseUrl();
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Unable to reach the DownloadDash API proxy at ${baseUrl}. ` +
        `Check that the Vercel deployment is live and that server-side DOWNLOADDASH_API_KEY is configured.`
    );
  }

  // --- FIX: Get response text first to handle empty responses ---
  let responseText;
  try {
    responseText = await res.text();
  } catch {
    throw new Error('Failed to read response from server');
  }

  // --- FIX: Check for empty response ---
  if (!responseText || responseText.trim() === '') {
    if (res.status === 404) {
      throw new Error(`API endpoint not found. Please check your API configuration.`);
    }
    throw new Error(`Server returned an empty response (${res.status})`);
  }

  // --- FIX: Parse JSON with error handling ---
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('JSON Parse Error:', parseError);
    console.log('Raw response:', responseText.substring(0, 500));
    throw new Error('Invalid response format from server');
  }

  if (!res.ok) {
    if (res.status === 500 && data?.message?.includes('API key is not configured')) {
      throw new Error(data.message);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        data?.message === 'Unauthorized'
          ? 'DownloadDash API authentication failed. Check the server-side DOWNLOADDASH_API_KEY in Vercel.'
          : data?.message || 'DownloadDash API request was forbidden.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        data?.message || `API endpoint not found (${res.status}). Please check your API configuration.`
      );
    }
    if (res.status === 429) {
      throw new Error(
        data?.message || 'Rate limit exceeded. Please try again later.'
      );
    }
    const message =
      data?.detail ||
      data?.error ||
      data?.message ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};

const sanitizeFilename = (name) =>
  String(name || 'download')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

const triggerBrowserDownload = async (res, filename) => {
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
  return true;
};

const isTikTokSourceUrl = (sourceUrl = '') =>
  String(sourceUrl || '').toLowerCase().includes('tiktok.com');

const isTikTokMediaUrl = (fileUrl, sourceUrl = '') => {
  const value = `${fileUrl || ''} ${sourceUrl || ''}`.toLowerCase();
  return (
    isTikTokSourceUrl(sourceUrl) ||
    value.includes('tiktok.com') ||
    value.includes('tiktokcdn') ||
    value.includes('tiktokv.com') ||
    value.includes('muscdn') ||
    value.includes('byteoversea') ||
    value.includes('ibytedtos') ||
    value.includes('bytecdn') ||
    value.includes('byteimg') ||
    value.includes('p16-sign') ||
    value.includes('p19-sign') ||
    value.includes('tos-')
  );
};

const inferMediaTypeFromUrl = (url = '') => {
  const cleanUrl = String(url || '').split('?')[0].toLowerCase();
  if (/\.(mp3|m4a|aac|wav|ogg|opus)$/.test(cleanUrl)) return 'audio';
  if (/\.(mp4|webm|mov|mkv|m3u8)$/.test(cleanUrl)) return 'video';
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/.test(cleanUrl)) return 'image';
  return '';
};

const firstValue = (entry, keys) => {
  for (const key of keys) {
    if (entry?.[key]) return entry[key];
  }
  return null;
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const collectNestedMediaCollections = (source, depth = 0) => {
  if (!source || depth > 4 || typeof source !== 'object') return [];
  const collections = [];
  const keys = [
    'items',
    'images',
    'photos',
    'photo',
    'carousel',
    'media',
    'medias',
    'resources',
    'variants',
    'children',
    'edges',
  ];

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) collections.push(...value);
  }

  for (const nestedKey of [
    'media_info',
    'mediaInfo',
    'shortcode_media',
    'graphql',
    'data',
    'post',
    'legacy',
    'extended_entities',
    'edge_sidecar_to_children',
  ]) {
    collections.push(...collectNestedMediaCollections(source[nestedKey], depth + 1));
  }

  return collections;
};

const normalizeMediaItem = (item, index, fallbackType = 'image') => {
  const entry = item?.node ? item.node : item;
  if (!entry) return null;

  if (typeof entry === 'string') {
    return {
      url: absolutizeApiUrl(entry),
      type: inferMediaTypeFromUrl(entry) || fallbackType,
      thumbnail: absolutizeApiUrl(entry),
      index,
    };
  }

  const url = firstValue(entry, [
    'url',
    'download_url',
    'downloadUrl',
    'media_url',
    'mediaUrl',
    'display_url',
    'displayUrl',
    'image_url',
    'imageUrl',
    'video_url',
    'videoUrl',
    'play_url',
    'playUrl',
    'src',
  ]);

  if (!url) return null;

  const inferredType = inferMediaTypeFromUrl(url);
  const type =
    entry.type ||
    entry.media_type ||
    entry.mediaType ||
    (entry.is_video || entry.isVideo ? 'video' : '') ||
    inferredType ||
    fallbackType;

  const thumbnail = firstValue(entry, [
    'thumbnail',
    'thumbnail_url',
    'thumbnailUrl',
    'preview_url',
    'previewUrl',
    'display_url',
    'image_url',
  ]);

  return {
    url: absolutizeApiUrl(url),
    type: String(type).toLowerCase(),
    filename: entry.filename || entry.file_name,
    extension: entry.extension,
    width: entry.width,
    height: entry.height,
    thumbnail: absolutizeApiUrl(thumbnail || url),
    index,
  };
};

const collectMediaItems = (data, downloads) => {
  const mediaInfo = data?.media_info || {};
  const shortcodeMedia = mediaInfo?.shortcode_media || data?.shortcode_media || data?.graphql?.shortcode_media;
  const sidecarEdges =
    mediaInfo?.edge_sidecar_to_children?.edges ||
    shortcodeMedia?.edge_sidecar_to_children?.edges ||
    data?.edge_sidecar_to_children?.edges;
  const candidates = [
    ...asArray(downloads?.items),
    ...asArray(downloads?.images),
    ...asArray(downloads?.photos),
    ...asArray(downloads?.photo),
    ...asArray(downloads?.carousel),
    ...asArray(downloads?.media),
    ...asArray(data?.items),
    ...asArray(data?.images),
    ...asArray(data?.photos),
    ...asArray(data?.photo),
    ...asArray(data?.carousel),
    ...asArray(data?.media),
    ...asArray(mediaInfo?.items),
    ...asArray(mediaInfo?.images),
    ...asArray(mediaInfo?.photos),
    ...asArray(mediaInfo?.photo),
    ...asArray(mediaInfo?.carousel),
    ...asArray(mediaInfo?.media),
    ...asArray(sidecarEdges),
    ...collectNestedMediaCollections(data),
    ...collectNestedMediaCollections(downloads),
  ];

  const seen = new Set();
  return candidates
    .map((item, index) => normalizeMediaItem(item, index))
    .filter((item) => {
      if (!item?.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .map((item, index) => ({ ...item, index }));
};

const findAudioUrl = (...sources) => {
  const directKeys = [
    'audio',
    'audio_url',
    'audioUrl',
    'music_url',
    'musicUrl',
    'sound_url',
    'soundUrl',
    'mp3',
    'm4a',
  ];

  for (const source of sources) {
    const direct = firstValue(source, directKeys);
    if (typeof direct === 'string') return direct;

    for (const nestedKey of ['music', 'sound', 'audio_info', 'audioInfo']) {
      const nested = source?.[nestedKey];
      const nestedDirect = firstValue(nested, directKeys.concat(['play_url', 'playUrl', 'url']));
      if (typeof nestedDirect === 'string') return nestedDirect;
    }
  }

  return null;
};

export const downloadToDevice = async (fileUrl, filename, sourceUrl = '', mediaType = '') => {
  const safeName = sanitizeFilename(filename);
  const absoluteFileUrl = absolutizeApiUrl(fileUrl);
  const baseUrl = getApiBaseUrl();
  const isApiManagedDownload =
    typeof absoluteFileUrl === 'string' &&
    (absoluteFileUrl.startsWith(`${baseUrl}/download/file`) ||
      absoluteFileUrl.startsWith(`${baseUrl}/youtube/file`));

  const proxyDownload = async () => {
    const proxyRes = await fetch(`${baseUrl}/download/file`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        url: absoluteFileUrl,
        filename: safeName || 'download',
        sourceUrl,
        mediaType,
      }),
    });
    if (!proxyRes.ok) {
      const message = await getResponseMessage(proxyRes, `Proxy download failed (${proxyRes.status})`);
      throw new Error(message);
    }
    return triggerBrowserDownload(proxyRes, safeName || 'download');
  };

  if (isTikTokMediaUrl(absoluteFileUrl, sourceUrl) && !isApiManagedDownload) {
    return proxyDownload();
  }

  try {
    const res = await fetch(absoluteFileUrl, { method: 'GET' });
    if (!res.ok) {
      const message = await getResponseMessage(res, `Failed to fetch file (${res.status})`);
      throw new Error(message);
    }
    return triggerBrowserDownload(res, safeName || 'download');
  } catch (error) {
    if (isApiManagedDownload) {
      throw error;
    }
    return proxyDownload();
  }
};

export const fetchMediaBlob = async (fileUrl, sourceUrl = '', mediaType = '') => {
  const absoluteFileUrl = absolutizeApiUrl(fileUrl);
  const baseUrl = getApiBaseUrl();

  const proxyFetch = async () => {
    const proxyRes = await fetch(`${baseUrl}/download/file`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        url: absoluteFileUrl,
        filename: 'download',
        sourceUrl,
        mediaType,
      }),
    });
    if (!proxyRes.ok) {
      const message = await getResponseMessage(proxyRes, `Proxy download failed (${proxyRes.status})`);
      throw new Error(message);
    }
    return proxyRes.blob();
  };

  try {
    const res = await fetch(absoluteFileUrl, { method: 'GET' });
    if (!res.ok) {
      const message = await getResponseMessage(res, `Failed to fetch file (${res.status})`);
      throw new Error(message);
    }
    return res.blob();
  } catch (error) {
    if (isTikTokMediaUrl(absoluteFileUrl, sourceUrl)) return proxyFetch();
    return proxyFetch();
  }
};

const saveToHistory = async (entry) => {
  try {
    const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    history.unshift({ id: Date.now(), ...entry, downloadedAt: new Date().toISOString() });
    if (history.length > 50) history.pop();
    localStorage.setItem('downloadHistory', JSON.stringify(history));
    return { success: true };
  } catch {
    return { success: false };
  }
};

// --- FIX: Improved resolveViaApi with better error handling and platform mapping ---
const resolveViaApi = async ({ url, platform, quality, extractAudio }) => {
  if (platform === 'youtube' && useRapidApiForYoutube()) {
    throw new Error(
      'YouTube downloads are temporarily unavailable. The current RapidAPI provider is returning the wrong media, so DownloadDash has disabled YouTube downloads until a reliable provider is connected.'
    );
  }

  // --- FIX: Map platform to correct name ---
  const mappedPlatform = PLATFORM_MAP[platform] || platform;
  
  // --- FIX: Use correct API endpoint path (without /smd/) ---
  const apiPath = `/${mappedPlatform}/download`;
  
  // --- FIX: Validate we have a valid platform ---
  if (!mappedPlatform || mappedPlatform === 'undefined') {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const payload = {
    url,
    platform: mappedPlatform,
    quality: quality || 'highest',
    extract_audio: !!extractAudio,
    include_metadata: true,
  };

  console.log(`[DownloadDash] Resolving: ${mappedPlatform} | ${apiPath}`);

  let data;
  try {
    data = await postJson(apiPath, payload);
  } catch (error) {
    // --- FIX: Provide better error messages ---
    if (error.message.includes('404')) {
      throw new Error(`Platform "${platform}" endpoint not found. Please check your API configuration.`);
    }
    if (error.message.includes('empty response')) {
      throw new Error('Server returned an empty response. Please try again.');
    }
    throw error;
  }

  if (data?.success === false) {
    const message = data?.error || data?.message || 'Resolve failed';
    throw new Error(message);
  }

  // --- FIX: Normalize response data ---
  const title = data?.media_info?.title || data?.title || 'Media';
  const thumbnail =
    data?.media_info?.thumbnail_url ||
    data?.media_info?.preview_url ||
    data?.thumbnail_url ||
    null;

  const downloads = { ...(data?.downloads || {}) };
  
  // --- FIX: Extract download URLs from various possible locations ---
  if (!downloads.videoHD && downloads.video) downloads.videoHD = downloads.video;
  if (!downloads.videoSD && downloads.video) downloads.videoSD = downloads.video;
  if (!downloads.audio && downloads.audio_url) downloads.audio = downloads.audio_url;
  if (!downloads.image && data?.image) downloads.image = data.image;
  if (!downloads.image && data?.download_url) downloads.image = data.download_url;
  
  // --- FIX: Find audio from nested locations ---
  if (!downloads.audio) {
    downloads.audio = findAudioUrl(downloads, data, data?.media_info);
  }
  
  // --- FIX: Collect media items ---
  const collectedItems = collectMediaItems(data, downloads);
  if (collectedItems.length) downloads.items = collectedItems;
  
  // --- FIX: Absolutize all URLs ---
  downloads.videoHD = absolutizeApiUrl(downloads.videoHD);
  downloads.videoSD = absolutizeApiUrl(downloads.videoSD);
  downloads.video = absolutizeApiUrl(downloads.video);
  downloads.audio = absolutizeApiUrl(downloads.audio);
  downloads.image = absolutizeApiUrl(downloads.image);
  
  // --- FIX: Get image from items if not set ---
  if (!downloads.image && Array.isArray(downloads.items)) {
    const firstImage = downloads.items.find((item) => item.type !== 'video' && item.type !== 'audio');
    downloads.image = firstImage?.url;
  }
  
  // --- FIX: Determine media type ---
  const mediaType = data?.media_type || data?.media_info?.media_type || null;
  
  // --- FIX: Get primary download URL ---
  const downloadUrl =
    downloads.videoHD ||
    downloads.videoSD ||
    downloads.video ||
    downloads.audio ||
    downloads.image ||
    data?.download_url ||
    data?.media_info?.download_url ||
    data?.url;

  const fallbackImage =
    downloads.image ||
    data?.media_info?.thumbnail_url ||
    data?.media_info?.preview_url ||
    thumbnail ||
    null;

  // --- FIX: Ensure we have at least one URL ---
  if (!downloadUrl && !fallbackImage) {
    console.error('No download URL found in response:', data);
    throw new Error('No downloadable URL returned from API. The content may not be available for download.');
  }
  
  const finalDownloadUrl = downloadUrl || fallbackImage;

  // --- FIX: Determine content kind ---
  const hasVideo = !!(downloads.videoHD || downloads.videoSD || downloads.video);
  const hasAudio = !!downloads.audio;
  const hasImage = !!downloads.image;
  
  let kind = extractAudio
    ? 'audio'
    : hasVideo
      ? 'video'
      : hasAudio && !hasImage
        ? 'audio'
        : (mediaType || 'video');

  if (kind === 'photo' || kind === 'image') kind = 'image';
  if (kind === 'album' || kind === 'carousel') kind = 'album';

  // --- FIX: Ensure downloads have at least one URL per kind ---
  if (kind === 'video' && !downloads.videoHD && finalDownloadUrl) {
    downloads.videoHD = finalDownloadUrl;
    downloads.videoSD = downloads.videoSD || finalDownloadUrl;
  }
  if (kind === 'audio' && !downloads.audio && finalDownloadUrl) {
    downloads.audio = finalDownloadUrl;
  }
  if (kind === 'image' && !downloads.image && finalDownloadUrl) {
    downloads.image = finalDownloadUrl;
  }

  // --- FIX: Handle album items ---
  const albumItems = Array.isArray(downloads.items)
    ? downloads.items
        .map((item, index) => normalizeMediaItem(item, index))
        .filter((item) => item?.url)
    : null;

  if (albumItems && albumItems.length) {
    downloads.items = albumItems;
    if (albumItems.length > 1 && !hasVideo) kind = 'album';
    if (!downloads.image) {
      downloads.image = albumItems.find((item) => item.type !== 'video' && item.type !== 'audio')?.url;
    }
    const albumVideo = albumItems.find((item) => item.type === 'video');
    if (albumVideo && !downloads.videoHD) {
      downloads.videoHD = albumVideo.url;
      downloads.videoSD = downloads.videoSD || albumVideo.url;
    }
    const albumAudio = albumItems.find((item) => item.type === 'audio');
    if (albumAudio && !downloads.audio) {
      downloads.audio = albumAudio.url;
    }
  }

  // --- FIX: Get platform from response or fallback ---
  const platformOut = data?.media_info?.platform || data?.platform || mappedPlatform || 'unknown';

  return {
    success: true,
    title,
    thumbnail: absolutizeApiUrl(thumbnail),
    platform: platformOut,
    type: kind,
    author_username: data?.author_username || data?.media_info?.author_username || null,
    author_display_name: data?.author_display_name || data?.media_info?.author_display_name || null,
    like_count: data?.like_count ?? data?.media_info?.like_count ?? null,
    comment_count: data?.comment_count ?? data?.media_info?.comment_count ?? null,
    quality: quality || undefined,
    downloads: {
      videoHD: downloads.videoHD,
      videoSD: downloads.videoSD,
      audio: downloads.audio,
      image: downloads.image || thumbnail || undefined,
      items: downloads.items || undefined,
    },
    raw: data,
    downloadUrl: finalDownloadUrl,
    original_url: url,
  };
};

export const downloadDash = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => ({ email: 'user@downloaddash.com' }),
    redirectToLogin: () => {
      window.location.reload();
    },
  },
  appLogs: {
    logUserInApp: async () => true,
  },
  entities: {
    SavedContent: {
      create: async (data) => {
        try {
          const saved = JSON.parse(localStorage.getItem('savedContent') || '[]');
          saved.unshift({ id: Date.now(), ...data, savedAt: new Date().toISOString() });
          if (saved.length > 50) saved.pop();
          localStorage.setItem('savedContent', JSON.stringify(saved));
          return { success: true };
        } catch {
          return { success: false };
        }
      },
      filter: async (query, sort, limit) => {
        try {
          let items = JSON.parse(localStorage.getItem('savedContent') || '[]');
          if (query) {
            items = items.filter(item => {
              return Object.entries(query).every(([key, value]) => item[key] === value);
            });
          }
          if (sort) {
            const [field, order] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
            items.sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              if (order === 'desc') return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
              return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            });
          }
          if (limit) {
            items = items.slice(0, limit);
          }
          return items;
        } catch {
          return [];
        }
      },
    },
    DownloadHistory: {
      create: async (data) => saveToHistory(data),
      list: async () => JSON.parse(localStorage.getItem('downloadHistory') || '[]'),
      filter: async (query, sort, limit) => {
        try {
          let items = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
          if (query) {
            items = items.filter(item => {
              return Object.entries(query).every(([key, value]) => item[key] === value);
            });
          }
          if (sort) {
            const [field, order] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
            items.sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              if (order === 'desc') return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
              return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            });
          }
          if (limit) {
            items = items.slice(0, limit);
          }
          return items;
        } catch {
          return [];
        }
      },
      clear: async () => {
        localStorage.removeItem('downloadHistory');
        return { success: true };
      },
    },
  },
  functions: {
    invoke: async (functionName, params) => {
      if (functionName !== 'downloadVideo') {
        throw new Error(`Unknown function: ${functionName}`);
      }
      const { url, platform, quality, extractAudio } = params || {};
      if (!url) throw new Error('URL is required');

      const result = await resolveViaApi({
        url,
        platform,
        quality,
        extractAudio: !!extractAudio,
      });

      await saveToHistory({
        url,
        title: result.title,
        platform: result.platform,
        type: result.type,
        thumbnail: result.thumbnail,
      });

      return result;
    },
  },
  download: async (platform, params) => {
    const { url, quality, extractAudio } = params;
    return resolveViaApi({ url, platform, quality, extractAudio });
  },
  downloadToDevice,
  fetchMediaBlob,
};

export default downloadDash;