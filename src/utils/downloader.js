// Download utility for DownloadDash

/**
 * Deep scan helper to search an object recursively for any valid URL
 */
const findAnyValidUrl = (obj) => {
  if (!obj) return null;
  if (typeof obj === 'string') {
    if (obj.startsWith('http://') || obj.startsWith('https://')) {
      // Ignore common image extensions if looking for a fallback link, or accept everything
      return obj;
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findAnyValidUrl(item);
      if (found) return found;
    }
  }
  if (typeof obj === 'object') {
    // Prioritize keys that sound like media links
    const prioritizedKeys = ['url', 'download', 'download_url', 'link', 'src', 'href', 'media_url'];
    for (const key of prioritizedKeys) {
      if (obj[key] && typeof obj[key] === 'string' && (obj[key].startsWith('http://') || obj[key].startsWith('https://'))) {
        return obj[key];
      }
    }
    // Fallback scan everything else
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const found = findAnyValidUrl(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
};

/**
 * Download content from URL via the Vercel serverless API gateway
 */
export const downloadFromUrl = async (url, options = {}) => {
  const { platform = 'instagram', quality = 'high', extractAudio = false } = options;
  
  try {
    console.log(`[Downloader] Starting download from ${platform}:`, url);
    
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    const cleanUrl = url.trim(); 
    
    let targetEndpoint = `${platform.toLowerCase()}/download`;
    if (platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x') {
      targetEndpoint = 'twitter/download';
    }

    const response = await fetch(`/api/smd/${targetEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: cleanUrl,
        quality: quality,
        extractAudio: extractAudio
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result || result.success === false) {
      throw new Error(result?.message || result?.error || 'Failed to download content from provider');
    }
    
    // Transform response to ensure consistent format
    const transformedResult = transformDownloadResponse(result, platform);
    
    console.log(`[Downloader] Download successful for ${platform}:`, transformedResult.type);
    return transformedResult;
    
  } catch (error) {
    console.error('[Downloader] Download error:', error);
    throw new Error(error.message || 'Failed to download content');
  }
};

/**
 * Save media to device gallery with proper filename detection
 */
export const saveToGallery = async (mediaUrl, filename, options = {}) => {
  const { platform = 'instagram', mediaType = 'auto' } = options;
  
  try {
    console.log('[Downloader] Saving to gallery:', mediaUrl);
    
    if (!mediaUrl) {
      throw new Error('No media URL provided');
    }
    
    let detectedType = mediaType;
    if (detectedType === 'auto') {
      if (mediaUrl.includes('.mp4') || mediaUrl.includes('video')) {
        detectedType = 'video';
      } else if (mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || 
                 mediaUrl.includes('.png') || mediaUrl.includes('.webp')) {
        detectedType = 'image';
      } else {
        detectedType = 'unknown';
      }
    }
    
    let finalFilename = filename;
    if (!finalFilename) {
      const timestamp = Date.now();
      const platformPrefix = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      switch (detectedType) {
        case 'video':
          finalFilename = `${platformPrefix}_Video_${timestamp}.mp4`;
          break;
        case 'image':
          finalFilename = `${platformPrefix}_Photo_${timestamp}.jpg`;
          break;
        default:
          finalFilename = `${platformPrefix}_Media_${timestamp}.${getFileExtension(mediaUrl)}`;
      }
    }
    
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      return true;
    } else {
      return blob;
    }
  } catch (error) {
    console.error('[Downloader] Save error:', error);
    return false;
  }
};

export const saveMultipleToGallery = async (items, platform = 'instagram') => {
  const results = { success: [], failed: [], total: items.length };
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const success = await saveToGallery(item.url, item.filename, { platform, mediaType: item.type });
      if (success) {
        results.success.push({ index: i, filename: item.filename });
      } else {
        results.failed.push({ index: i, url: item.url, error: 'Save failed' });
      }
    } catch (error) {
      results.failed.push({ index: i, url: item.url, error: error.message });
    }
  }
  return results;
};

/**
 * Transform API response to consistent format
 */
const transformDownloadResponse = (response, platform) => {
  // Inspect incoming data structure
  console.log('[Downloader] Unpacking clean data payload structure:');
  console.dir(response);

  const payload = response.result || response || {};
  const { media_info, downloads, download_url, thumbnail, title, type, download_id } = payload;
  
  let mediaType = type || media_info?.media_type || 'unknown';
  let downloadUrls = {};
  let thumbnailUrl = thumbnail || media_info?.thumbnail_url;
  
  if (mediaType === 'image' || mediaType === 'photo') {
    mediaType = 'image';
  } else if (mediaType === 'carousel' || mediaType === 'album') {
    mediaType = 'carousel';
  } else if (mediaType === 'video' || mediaType === 'reel') {
    mediaType = 'video';
  }
  
  if (mediaType === 'carousel' || downloads) {
    const items = [];
    if (Array.isArray(downloads)) {
      downloads.forEach((item) => {
        const urlStr = typeof item === 'string' ? item : item.url;
        if (!urlStr) return;
        const isVideo = urlStr.includes('.mp4') || urlStr.includes('video');
        items.push({
          url: urlStr,
          type: isVideo ? 'video' : 'image',
          filename: generateFilename(platform, media_info, urlStr, isVideo ? 'video' : 'image')
        });
      });
    } else if (downloads && typeof downloads === 'object') {
      Object.entries(downloads).forEach(([key, url]) => {
        if (!url || typeof url !== 'string') return;
        const isVideo = url.includes('.mp4') || url.includes('video');
        items.push({
          url: url,
          type: isVideo ? 'video' : 'image',
          filename: generateFilename(platform, media_info, key, isVideo ? 'video' : 'image')
        });
      });
    }
    
    if (items.length > 0) {
      mediaType = 'carousel';
      downloadUrls = { items };
    }
  } 
  
  if (mediaType !== 'carousel') {
    // 1. Check strict parameters, 2. Look for recursive generic URL extraction fallback
    const fallbackUrl = download_url || payload.url || media_info?.download_url || media_info?.url || findAnyValidUrl(payload);
    
    if (!fallbackUrl) {
      throw new Error('No downloadable URL returned from API');
    }

    if (mediaType === 'video' || fallbackUrl.includes('.mp4') || fallbackUrl.includes('video')) {
      mediaType = 'video';
      downloadUrls = {
        videoHD: fallbackUrl,
        videoSD: fallbackUrl,
        audio: media_info?.audio_bitrate || payload.audio_url ? (payload.audio_url || `${fallbackUrl}?audio=1`) : null,
        thumbnail: thumbnailUrl
      };
    } else {
      mediaType = 'image';
      downloadUrls = {
        image: fallbackUrl,
        thumbnail: thumbnailUrl || fallbackUrl
      };
    }
  }
  
  return {
    success: true,
    type: mediaType,
    title: title || media_info?.title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Content`,
    thumbnail: thumbnailUrl,
    quality: media_info?.quality || media_info?.file_format || 'HD',
    duration: media_info?.duration ? formatDuration(media_info.duration) : null,
    downloads: downloadUrls,
    media_info: media_info,
    download_id: download_id || Date.now().toString()
  };
};

const generateFilename = (platform, mediaInfo, key, type) => {
  const username = mediaInfo?.author_username || mediaInfo?.username || platform;
  const timestamp = mediaInfo?.created_at || mediaInfo?.uploaded_at || new Date().toISOString();
  const date = new Date(timestamp).toISOString().split('T')[0];
  const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  let extension = type === 'video' ? 'mp4' : 'jpg';
  if (key && typeof key === 'string') {
    if (key.includes('.png')) extension = 'png';
    else if (key.includes('.webp')) extension = 'webp';
    else if (key.includes('.gif')) extension = 'gif';
  }
  return `${platform.charAt(0).toUpperCase() + platform.slice(1)}_${safeUsername}_${date}_${type === 'video' ? 'Video' : 'Photo'}.${extension}`;
};

const getFileExtension = (url) => {
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1] : 'mp4';
};

const formatDuration = (seconds) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const validateDownloadUrl = (url, platform = 'instagram') => {
  if (!url || typeof url !== 'string') return { valid: false, error: 'URL is required' };
  const trimmedUrl = url.trim();
  if (trimmedUrl.length < 10) return { valid: false, error: 'URL is too short' };
  try { new URL(trimmedUrl); } catch { return { valid: false, error: 'Invalid URL format' }; }
  
  const patterns = {
    instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+/i,
    facebook: /^https?:\/\/(www\.|m\.)?(facebook\.com|fb\.watch|fb\.me|fb\.gg)\/.+/i,
    tiktok: /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    youtube: /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/.+/i,
    twitter: /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+/i,
    pinterest: /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.com|pin\.it)\/.+/i,
    reddit: /^https?:\/\/(www\.)?(reddit\.com|redd\.it)\/.+/i
  };
  
  const pattern = patterns[platform.toLowerCase()];
  if (pattern && !pattern.test(trimmedUrl)) return { valid: false, error: `Please enter a valid ${platform} URL` };
  return { valid: true, url: trimmedUrl };
};

export const batchDownload = async (urls, options = {}) => {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const result = await downloadFromUrl(urls[i], options);
      results.push({ success: true, index: i, data: result });
    } catch (error) {
      results.push({ success: false, index: i, error: error.message });
    }
  }
  return results;
};

const downloader = { download: downloadFromUrl, saveToGallery, saveMultiple: saveMultipleToGallery, validate: validateDownloadUrl, batch: batchDownload };
export default downloader;
EOF