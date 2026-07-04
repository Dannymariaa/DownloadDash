// @ts-nocheck

const DEFAULT_API_BASE_URL = '/api';

const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_SMD_API_BASE_URL || DEFAULT_API_BASE_URL;
  return String(raw).replace(/\/+$/, '');
};

const shouldSendApiKey = () => {
  const flag = String(import.meta.env.VITE_SMD_REQUIRE_API_KEY || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
};

const getApiKey = () => {
  if (!shouldSendApiKey()) return '';

  const value = String(import.meta.env.VITE_SMD_API_KEY || '').trim();
  if (!value || value === 'your_api_key_here') return '';
  return value;
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

const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = getApiKey();
  if (apiKey) headers['X-API-Key'] = apiKey;
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
      `Unable to reach the DownloadDash API at ${baseUrl}. ` +
        `Check that https://api.downloaddash.store is live and that VITE_SMD_API_BASE_URL is set correctly in Vercel.`
    );
  }

  const data = await tryParseJson(res);
  if (!res.ok) {
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

    // Fallback: proxy download through API to avoid CORS blocks.
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

const resolveViaApi = async ({ url, platform, quality, extractAudio }) => {
  if (platform === 'youtube' && useRapidApiForYoutube()) {
    throw new Error(
      'YouTube downloads are temporarily unavailable. The current RapidAPI provider is returning the wrong media, so DownloadDash has disabled YouTube downloads until a reliable provider is connected.'
    );
  }

  const normalizedPlatform =
    platform === 'whatsappbusiness'
      ? 'whatsapp_business'
      : platform;

  const payload = {
    url,
    platform: normalizedPlatform,
    quality: quality || 'highest',
    extract_audio: !!extractAudio,
    include_metadata: true,
  };

  const data = await postJson(`/${normalizedPlatform}/download`, payload);

  if (data?.success === false) {
    const message = data?.error || data?.message || 'Resolve failed';
    throw new Error(message);
  }

  const title = data?.media_info?.title || 'Media';
  const thumbnail =
    data?.media_info?.thumbnail_url ||
    data?.media_info?.preview_url ||
    null;

  const downloads = { ...(data?.downloads || {}) };
  if (!downloads.videoHD && downloads.video) downloads.videoHD = downloads.video;
  if (!downloads.videoSD && downloads.video) downloads.videoSD = downloads.video;
  if (!downloads.audio && downloads.audio_url) downloads.audio = downloads.audio_url;
  if (!downloads.audio) {
    downloads.audio = findAudioUrl(downloads, data, data?.media_info);
  }
  const collectedItems = collectMediaItems(data, downloads);
  if (collectedItems.length) downloads.items = collectedItems;
  downloads.videoHD = absolutizeApiUrl(downloads.videoHD);
  downloads.videoSD = absolutizeApiUrl(downloads.videoSD);
  downloads.video = absolutizeApiUrl(downloads.video);
  downloads.audio = absolutizeApiUrl(downloads.audio);
  downloads.image = absolutizeApiUrl(downloads.image);
  if (!downloads.image && Array.isArray(downloads.items)) {
    const firstImage = downloads.items.find((item) => item.type !== 'video' && item.type !== 'audio');
    downloads.image = firstImage?.url;
  }
  const mediaType = data?.media_type || data?.media_info?.media_type || null;
  const downloadUrl =
    downloads.videoHD ||
    downloads.videoSD ||
    downloads.video ||
    downloads.audio ||
    downloads.image ||
    data?.download_url ||
    data?.media_info?.download_url;

  const fallbackImage =
    downloads.image ||
    data?.media_info?.thumbnail_url ||
    data?.media_info?.preview_url ||
    null;

  if (!downloadUrl && fallbackImage) {
    downloads.image = downloads.image || fallbackImage;
  }

  if (!downloadUrl && !fallbackImage) {
    throw new Error('No downloadable URL returned from API');
  }
  const finalDownloadUrl = downloadUrl || fallbackImage;

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

  // Ensure we always expose at least one actionable download per resolved kind.
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

  const platformOut = data?.media_info?.platform || platform || 'unknown';

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

  return {
    success: true,
    title,
    thumbnail,
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
      // No auth system yet; keep behavior non-breaking.
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
