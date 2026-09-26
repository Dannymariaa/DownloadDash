// @ts-nocheck
// src/api/downloadDashClient.js

const DEFAULT_API_BASE_URL = '/api/smd';
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
  'x': 'x',
  'twitter': 'twitter',
  'telegram': 'telegram',
  'whatsappbusiness': 'whatsapp_business',
  'whatsapp_business': 'whatsapp_business'
};

const getApiBaseUrl = () => {
  const raw = import.meta.env?.VITE_SMD_API_BASE_URL || DEFAULT_API_BASE_URL;
  const normalized = String(raw).replace(/\/+$/, '') || DEFAULT_API_BASE_URL;

  if (normalized === '/api' || normalized === '/api/smd') return DEFAULT_API_BASE_URL;

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
  const flag = String(import.meta.env?.VITE_USE_RAPIDAPI_YOUTUBE || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
};

const absolutizeApiUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('/')) return url;
  return `${getApiBaseUrl()}${url}`;
};

const buildHeaders = () => {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
};

const safeHeadersForDiagnostics = (headers) =>
  Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key,
      /authorization|api[-_]?key|download/i.test(key) ? '[redacted]' : value,
    ])
  );

const summarizeResponseBody = (body) => {
  if (!body) return '';
  if (typeof body === 'string') return body.slice(0, 1200);
  try {
    return JSON.stringify(body).slice(0, 1200);
  } catch {
    return String(body).slice(0, 1200);
  }
};

export const USER_SAFE_ERROR_MESSAGES = {
  SERVICE_CONFIGURATION_ERROR: 'The download service is temporarily unavailable. Please try again shortly.',
  UPSTREAM_UNAVAILABLE: 'The download service is temporarily unavailable. Please try again shortly.',
  UPSTREAM_TIMEOUT: 'The download service is temporarily unavailable. Please try again shortly.',
  UPSTREAM_AUTH_FAILED: 'The download service is temporarily unavailable. Please try again shortly.',
  UPSTREAM_PROXY_FAILED: 'The download service is temporarily unavailable. Please try again shortly.',
  UPSTREAM_ROUTE_NOT_FOUND: 'The download service is temporarily unavailable. Please try again shortly.',
  INVALID_URL: 'Enter a valid link for this downloader.',
  URL_REQUIRED: 'Paste a link to download.',
  UNSUPPORTED_DOMAIN: 'Paste a link from the selected platform.',
  UNSUPPORTED_PROTOCOL: 'Only HTTP and HTTPS links are supported.',
  BLOCKED_HOST: 'Paste a public platform link.',
  MEDIA_NOT_FOUND: 'Media was not found or is no longer available.',
  PRIVATE_MEDIA: 'This media is private, restricted, or unavailable.',
  LOGIN_REQUIRED: 'X is currently requiring an authenticated session for this media. Please try again later.',
  COOKIE_REQUIRED: 'This media currently requires an authenticated platform session. Please try again later.',
  COOKIE_EXPIRED: 'This media currently requires a refreshed platform session. Please try again later.',
  ANTI_BOT_CHALLENGE: 'Facebook temporarily blocked access to this public post. Try again later or try another public link.',
  PLATFORM_BLOCKED_PROXY: 'The platform temporarily blocked this request. Please try again later.',
  PROXY_BLOCKED: 'The download service is temporarily blocked by the platform. Please try again later.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  EXTRACTOR_OUTDATED: 'This media cannot be resolved right now. Please try again later.',
  EXTRACTOR_FAILED: 'This media could not be resolved right now. Please try again later.',
  UNSUPPORTED_MEDIA: 'This media is not supported for download.',
  UPSTREAM_RATE_LIMITED: 'Too many requests. Please try again later.',
};

const responseErrorCode = (data) => {
  if (typeof data?.error === 'string') return data.error;
  return data?.error?.code || data?.code || null;
};

export const responseErrorMessage = (data, fallback) => {
  const code = responseErrorCode(data);
  if (code && USER_SAFE_ERROR_MESSAGES[code]) return USER_SAFE_ERROR_MESSAGES[code];
  if (typeof data?.error === 'object' && data.error?.message) return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  return data?.detail || data?.message || fallback;
};

const createRequestError = ({ method, url, path, headers, status, statusText, data, fallback }) => {
  const backendMessage = responseErrorMessage(data, fallback);
  const diagnostics = {
    method,
    endpoint: path,
    url,
    headers: safeHeadersForDiagnostics(headers),
    status,
    statusText,
    backendMessage,
    responseBody: summarizeResponseBody(data),
  };

  const error = new Error(
    [
      backendMessage || `DownloadDash API request failed (${status})`,
      `method=${method}`,
      `endpoint=${path}`,
      `url=${url}`,
      `status=${status}${statusText ? ` ${statusText}` : ''}`,
      `headers=${JSON.stringify(diagnostics.headers)}`,
      `response=${diagnostics.responseBody || '[empty]'}`,
    ].join(' | ')
  );
  error.details = diagnostics;
  return error;
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
  return responseErrorMessage(data, fallback);
};

const postJson = async (path, body) => {
  const baseUrl = getApiBaseUrl();
  const method = 'POST';
  const url = `${baseUrl}${path}`;
  const headers = buildHeaders();

  console.log('[DownloadDash API] Request', {
    method,
    endpoint: path,
    url,
    headers: safeHeadersForDiagnostics(headers),
    payload: body,
  });

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw createRequestError({
      method,
      url,
      path,
      headers,
      status: 0,
      statusText: 'NETWORK_ERROR',
      data: { message: error?.message || 'Network connection failed.' },
      fallback:
        `Unable to reach the DownloadDash API proxy at ${baseUrl}. ` +
        'The download service may be temporarily unavailable.',
    });
  }

  let responseText;
  try {
    responseText = await res.text();
  } catch {
    throw createRequestError({
      method,
      url,
      path,
      headers,
      status: res.status,
      statusText: res.statusText,
      data: { message: 'Failed to read response from server' },
      fallback: 'Failed to read response from server',
    });
  }

  if (!responseText || responseText.trim() === '') {
    throw createRequestError({
      method,
      url,
      path,
      headers,
      status: res.status,
      statusText: res.statusText,
      data: '',
      fallback:
        res.status === 404
          ? 'The download service is temporarily unavailable. Please try again shortly.'
          : `Server returned an empty response (${res.status})`,
    });
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('[DownloadDash API] JSON parse error:', parseError);
    throw createRequestError({
      method,
      url,
      path,
      headers,
      status: res.status,
      statusText: res.statusText,
      data: responseText,
      fallback: 'Invalid response format from server',
    });
  }

  console.log('[DownloadDash API] Response', {
    method,
    endpoint: path,
    url,
    status: res.status,
    response: data,
  });

  if (!res.ok) {
    const code = responseErrorCode(data);

    if (code && USER_SAFE_ERROR_MESSAGES[code]) {
      throw createRequestError({ method, url, path, headers, status: res.status, statusText: res.statusText, data, fallback: data.message });
    }
    if (res.status === 401 || res.status === 403) {
      throw createRequestError({
        method,
        url,
        path,
        headers,
        status: res.status,
        statusText: res.statusText,
        data,
        fallback:
          data?.message === 'Unauthorized'
            ? 'The download service is temporarily unavailable.'
            : data?.message || 'DownloadDash API request was forbidden.',
      });
    }
    if (res.status === 404) {
      throw createRequestError({
        method,
        url,
        path,
        headers,
        status: res.status,
        statusText: res.statusText,
        data,
        fallback: data?.message || 'The download service is temporarily unavailable. Please try again shortly.',
      });
    }
    if (res.status === 429) {
      throw createRequestError({
        method,
        url,
        path,
        headers,
        status: res.status,
        statusText: res.statusText,
        data,
        fallback: data?.message || 'Rate limit exceeded. Please try again later.',
      });
    }
    const message =
      responseErrorMessage(data, `Request failed (${res.status})`);
    throw createRequestError({ method, url, path, headers, status: res.status, statusText: res.statusText, data, fallback: message });
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

export const inferMediaTypeFromUrl = (url = '') => {
  const cleanUrl = String(url || '').split('?')[0].toLowerCase();
  if (/\.(mp3|m4a|aac|wav|ogg|opus)$/.test(cleanUrl)) return 'audio';
  if (/\.(mp4|webm|mov|mkv|m3u8)$/.test(cleanUrl)) return 'video';
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/.test(cleanUrl)) return 'image';
  return '';
};

const normalizeMediaType = (value = '') => {
  const normalized = String(value || '').toLowerCase();
  if (['image', 'photo', 'picture', 'img'].includes(normalized)) return 'image';
  if (['video', 'movie', 'reel'].includes(normalized)) return 'video';
  if (['audio', 'music', 'sound'].includes(normalized)) return 'audio';
  return '';
};

const inferMediaTypeFromMime = (mimeType = '') => {
  const normalized = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/') || normalized === 'application/vnd.apple.mpegurl') return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  return '';
};

const formatFromMime = (mimeType = '') => {
  const normalized = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const subtype = normalized.split('/')[1];
  if (!subtype) return '';
  if (subtype === 'jpeg') return 'jpg';
  if (subtype === 'mpegurl' || normalized === 'application/vnd.apple.mpegurl') return 'm3u8';
  return subtype.replace(/^x-/, '');
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

const primaryMediaUrl = (entry, key = '') => {
  const explicitType = normalizeMediaType(entry.type || entry.media_type || entry.mediaType || entry.kind);
  const keyType = normalizeMediaType(key);

  if (explicitType === 'video' || entry.is_video === true || entry.isVideo === true) {
    return firstValue(entry, [
      'video_url',
      'videoUrl',
      'video',
      'url',
      'download_url',
      'downloadUrl',
      'media_url',
      'mediaUrl',
      'play_url',
      'playUrl',
      'src',
    ]);
  }

  if (explicitType === 'image' || keyType === 'image' || entry.is_video === false || entry.isVideo === false) {
    return firstValue(entry, [
      'image_url',
      'imageUrl',
      'display_url',
      'displayUrl',
      'url',
      'download_url',
      'downloadUrl',
      'media_url',
      'mediaUrl',
      'src',
    ]);
  }

  if (explicitType === 'audio' || keyType === 'audio') {
    return firstValue(entry, [
      'audio_url',
      'audioUrl',
      'music_url',
      'musicUrl',
      'sound_url',
      'soundUrl',
      'audio',
      'url',
      'download_url',
      'downloadUrl',
      'media_url',
      'mediaUrl',
      'src',
    ]);
  }

  return firstValue(entry, [
    'url',
    'download_url',
    'downloadUrl',
    'media_url',
    'mediaUrl',
    'video_url',
    'videoUrl',
    'image_url',
    'imageUrl',
    'display_url',
    'displayUrl',
    'play_url',
    'playUrl',
    'src',
  ]);
};

export const normalizeMediaItem = (item, index, fallbackType = 'unknown', key = '') => {
  const entry = item?.node ? item.node : item;
  if (!entry) return null;

  if (typeof entry === 'string') {
    const type = inferMediaTypeFromUrl(entry) || normalizeMediaType(fallbackType) || 'unknown';
    return {
      url: absolutizeApiUrl(entry),
      type,
      thumbnail: type === 'image' ? absolutizeApiUrl(entry) : undefined,
      id: `media-${index}`,
      index,
    };
  }

  const url = primaryMediaUrl(entry, key || fallbackType);

  if (!url) return null;

  const mimeType = firstValue(entry, ['mimeType', 'mime_type', 'contentType', 'content_type', 'mimetype']);
  const explicitTypeValue = entry.type || entry.media_type || entry.mediaType || entry.kind;
  const explicitType = normalizeMediaType(explicitTypeValue);
  const hasUnrecognizedExplicitType = !!explicitTypeValue && !explicitType;
  const inferredType = inferMediaTypeFromUrl(url);
  const type =
    explicitType ||
    (hasUnrecognizedExplicitType ? '' : inferMediaTypeFromMime(mimeType)) ||
    (hasUnrecognizedExplicitType ? '' : (entry.is_video || entry.isVideo ? 'video' : '')) ||
    (hasUnrecognizedExplicitType ? '' : inferredType) ||
    (hasUnrecognizedExplicitType ? '' : normalizeMediaType(fallbackType)) ||
    'unknown';

  const thumbnail = firstValue(entry, [
    'thumbnail',
    'thumbnail_url',
    'thumbnailUrl',
    'preview_url',
    'previewUrl',
    'display_url',
    'image_url',
  ]);

  const normalized = {
    id: entry.id || `media-${index}`,
    url: absolutizeApiUrl(url),
    type,
    filename: entry.filename || entry.file_name,
    extension: entry.extension || entry.format || formatFromMime(mimeType) || undefined,
    format: entry.format || entry.extension || formatFromMime(mimeType) || undefined,
    mimeType: mimeType || undefined,
    width: entry.width,
    height: entry.height,
    quality: entry.quality,
    hasAudio: entry.hasAudio ?? entry.has_audio,
    audioUrl: absolutizeApiUrl(entry.audioUrl || entry.audio_url),
    thumbnail: absolutizeApiUrl(thumbnail || (type === 'image' ? url : undefined)),
    index,
  };

  if (Array.isArray(entry.variants)) {
    const seenVariants = new Set();
    const variants = entry.variants
      .map((variant) => normalizeMediaItem(variant, index, type))
      .filter((variant) => {
        if (!variant?.url || seenVariants.has(variant.url)) return false;
        seenVariants.add(variant.url);
        return true;
      })
      .map(({ variants: _variants, id: _id, index: _index, thumbnail: _thumbnail, ...variant }) => variant);
    if (variants.length) normalized.variants = variants;
  }

  return normalized;
};

const collectMediaItems = (data, downloads) => {
  if (Array.isArray(downloads?.items) && downloads.items.length) {
    return downloads.items
      .map((item, index) => normalizeMediaItem(item, index, item?.type || 'unknown'))
      .filter((item) => item?.url)
      .map((item, index) => ({ ...item, id: item.id || `media-${index}`, index }));
  }

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
    .map((item, index) => normalizeMediaItem(item, index, 'unknown'))
    .filter((item) => {
      const identity = `${item?.url || ''}`;
      if (!item?.url || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .map((item, index) => ({ ...item, index }));
};

export const getSelectableMediaItems = (items = []) =>
  (Array.isArray(items) ? items : []).filter((item) => item?.url && item.type !== 'unknown');

export const normalizeResolvedDownloads = (data = {}) => {
  const downloads = { ...(data.downloads || {}) };
  const items = Array.isArray(downloads.items)
    ? downloads.items
        .map((item, index) => normalizeMediaItem(item, index, item?.type || 'unknown'))
        .filter((item) => item?.url)
        .map((item, index) => ({ ...item, id: item.id || `media-${index}`, index }))
    : [];

  if (items.length) {
    downloads.items = items;
    const firstImage = items.find((item) => item.type === 'image');
    const firstVideo = items.find((item) => item.type === 'video');
    const firstAudio = items.find((item) => item.type === 'audio');
    if (firstImage && !downloads.image) downloads.image = firstImage.url;
    if (firstVideo && !downloads.videoHD) {
      downloads.videoHD = firstVideo.url;
      downloads.videoSD = downloads.videoSD || firstVideo.url;
    }
    if (firstAudio && !downloads.audio) downloads.audio = firstAudio.url;
  }

  const sourceMediaCount = items.filter((item) => item.type === 'image' || item.type === 'video').length;
  let type = normalizeMediaType(data.type || data.kind || data.media_type) || data.type || 'unknown';
  if (type === 'carousel') type = 'album';
  if (sourceMediaCount > 1) type = 'album';

  return {
    ...data,
    type,
    downloads,
  };
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

const normalizeSharedProxyResponse = (data) => {
  const proxyData = data?.data;
  const proxyMedia = data?.data?.media;
  if (!proxyData || !Array.isArray(proxyMedia)) return data;

  const downloads = {};
  const items = [];

  proxyMedia.forEach((item, index) => {
    const normalized = normalizeMediaItem(item, index, item?.type || 'unknown');
    if (normalized) items.push(normalized);

    const mediaUrl = item?.url;
    if (!mediaUrl) return;

    const type = normalizeMediaType(item.type) || inferMediaTypeFromMime(item.mimeType || item.mime_type || item.contentType || item.content_type) || inferMediaTypeFromUrl(mediaUrl) || 'unknown';
    const quality = String(item.quality || '').toLowerCase();

    if (type === 'audio' && !downloads.audio) downloads.audio = mediaUrl;
    if (type === 'image' && !downloads.image) downloads.image = mediaUrl;
    if (type === 'video') {
      if (quality.includes('hd') && !downloads.videoHD) downloads.videoHD = mediaUrl;
      if (quality.includes('sd') && !downloads.videoSD) downloads.videoSD = mediaUrl;
      if (!downloads.video) downloads.video = mediaUrl;
    }
  });

  if (items.length) downloads.items = items;
  if (!downloads.videoHD && downloads.video) downloads.videoHD = downloads.video;
  if (!downloads.videoSD && downloads.video) downloads.videoSD = downloads.video;

  return {
    ...data,
    title: proxyData.title,
    thumbnail: proxyData.thumbnail,
    author_username: proxyData.author,
    media_info: {
      ...(data.media_info || {}),
      title: proxyData.title,
      thumbnail_url: proxyData.thumbnail,
      author_username: proxyData.author,
      platform: data.platform,
    },
    downloads,
  };
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
    data = normalizeSharedProxyResponse(await postJson(apiPath, payload));
  } catch (error) {
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
    const firstImage = downloads.items.find((item) => item.type === 'image');
    downloads.image = firstImage?.url;
  }
  
  // --- FIX: Determine media type ---
  const mediaType = normalizeMediaType(data?.media_type || data?.media_info?.media_type) || null;
  
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
        : (mediaType || 'unknown');

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
        .map((item, index) => normalizeMediaItem(item, index, item?.type || 'unknown'))
        .filter((item) => item?.url)
    : null;

  if (albumItems && albumItems.length) {
    downloads.items = albumItems;
    const sourceMediaCount = albumItems.filter((item) => item.type === 'image' || item.type === 'video').length;
    if (sourceMediaCount > 1) kind = 'album';
    if (!downloads.image) {
      downloads.image = albumItems.find((item) => item.type === 'image')?.url;
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
  const normalized = normalizeResolvedDownloads({ type: kind, downloads });

  return {
    success: true,
    title,
    thumbnail: absolutizeApiUrl(thumbnail),
    platform: platformOut,
    type: normalized.type,
    author_username: data?.author_username || data?.media_info?.author_username || null,
    author_display_name: data?.author_display_name || data?.media_info?.author_display_name || null,
    like_count: data?.like_count ?? data?.media_info?.like_count ?? null,
    comment_count: data?.comment_count ?? data?.media_info?.comment_count ?? null,
    quality: quality || undefined,
    downloads: {
      videoHD: normalized.downloads.videoHD,
      videoSD: normalized.downloads.videoSD,
      audio: normalized.downloads.audio,
      image: normalized.downloads.image || undefined,
      items: normalized.downloads.items || undefined,
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
