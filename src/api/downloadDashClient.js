// @ts-nocheck

const DEFAULT_API_BASE_URL = '/api';

const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_SMD_API_BASE_URL || DEFAULT_API_BASE_URL;
  return String(raw).replace(/\/+$/, '');
};

const getApiKey = () => import.meta.env.VITE_SMD_API_KEY || '';

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

export const downloadToDevice = async (fileUrl, filename) => {
  const safeName = sanitizeFilename(filename);
  const absoluteFileUrl = absolutizeApiUrl(fileUrl);
  const baseUrl = getApiBaseUrl();
  const isApiManagedDownload =
    typeof absoluteFileUrl === 'string' &&
    absoluteFileUrl.startsWith(`${baseUrl}/youtube/file`);

  try {
    const res = await fetch(absoluteFileUrl, { method: 'GET' });
    if (!res.ok) {
      const message = await getResponseMessage(res, `Failed to fetch file (${res.status})`);
      throw new Error(message);
    }
    const blob = await res.blob();

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch (error) {
    if (isApiManagedDownload) {
      throw error;
    }

    // Fallback: proxy download through API to avoid CORS blocks
    const proxyRes = await fetch(`${baseUrl}/download/file`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ url: absoluteFileUrl, filename: safeName || 'download' }),
    });
    if (!proxyRes.ok) {
      const message = await getResponseMessage(proxyRes, `Proxy download failed (${proxyRes.status})`);
      throw new Error(message);
    }
    const blob = await proxyRes.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return true;
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
  downloads.videoHD = absolutizeApiUrl(downloads.videoHD);
  downloads.videoSD = absolutizeApiUrl(downloads.videoSD);
  downloads.video = absolutizeApiUrl(downloads.video);
  downloads.audio = absolutizeApiUrl(downloads.audio);
  downloads.image = absolutizeApiUrl(downloads.image);
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

  const albumItems = Array.isArray(data?.images)
    ? data.images.map((img) => ({
        url: img.url,
        type: img.type || 'image',
        width: img.width,
        height: img.height,
        thumbnail: img.thumbnail,
      }))
    : null;

  if (albumItems && albumItems.length) {
    downloads.items = albumItems;
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
};

export default downloadDash;
