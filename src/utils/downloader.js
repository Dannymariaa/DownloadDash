// Download utility for DownloadDash

/**
 * Download content from URL via the Vercel serverless API gateway
 * @param {string} url - The URL to download
 * @param {Object} options - Download options
 * @param {string} options.platform - Platform name (instagram, facebook, tiktok, youtube, twitter, pinterest, reddit)
 * @param {string} options.quality - Quality preference (high, medium, low)
 * @param {boolean} options.extractAudio - Whether to extract audio
 * @returns {Promise<Object>} - Download result with media info
 */
export const downloadFromUrl = async (url, options = {}) => {
  const { platform = 'instagram', quality = 'high', extractAudio = false } = options;
  
  try {
    console.log(`[Downloader] Starting download from ${platform}:`, url);
    
    // Validate URL before attempting download
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    // Clean whitespace but KEEP critical query parameters intact for media tracking structures
    const cleanUrl = url.trim(); 
    
    // Determine target API endpoint dynamically based on platform
    let targetEndpoint = `${platform.toLowerCase()}/download`;
    if (platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x') {
      targetEndpoint = 'twitter/download';
    }

    // Call the Vercel API catch-all rewrite gateway directly
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
    
    // Provide user-friendly error messages
    let errorMessage = error.message || 'Failed to download content';
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      errorMessage = 'Access denied. The platform is blocking the request. Please try again later or use a VPN.';
    } else if (errorMessage.includes('404')) {
      errorMessage = 'Content not found. Please check the URL and try again.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Save media to device gallery with proper filename detection
 * @param {string} mediaUrl - The URL of the media to save
 * @param {string} filename - Desired filename (optional, will auto-detect if not provided)
 * @param {Object} options - Save options
 * @returns {Promise<boolean>} - Success status
 */
export const saveToGallery = async (mediaUrl, filename, options = {}) => {
  const { platform = 'instagram', mediaType = 'auto' } = options;
  
  try {
    console.log('[Downloader] Saving to gallery:', mediaUrl);
    
    if (!mediaUrl) {
      throw new Error('No media URL provided');
    }
    
    // Auto-detect media type from URL if not specified
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
    
    // Generate filename if not provided
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
    
    // Fetch the media file
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      
      link.href = objectUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(objectUrl);
      
      console.log('[Downloader] Media saved to gallery:', finalFilename);
      return true;
    } else {
      console.warn('[Downloader] Not in browser environment, returning blob');
      return blob;
    }
    
  } catch (error) {
    console.error('[Downloader] Save error:', error);
    return false;
  }
};

/**
 * Save multiple files (for multi-photo albums / carousel posts)
 * @param {Array} items - Array of {url, filename, type} objects
 * @param {string} platform - Platform name
 * @returns {Promise<Object>} - Results with success/failure counts
 */
export const saveMultipleToGallery = async (items, platform = 'instagram') => {
  const results = {
    success: [],
    failed: [],
    total: items.length
  };
  
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
  
  console.log(`[Downloader] Saved ${results.success.length}/${results.total} files`);
  return results;
};

/**
 * Transform API response to consistent format
 * @param {Object} response - Raw API response
 * @param {string} platform - Platform name
 * @returns {Object} - Transformed response
 */
const transformDownloadResponse = (response, platform) => {
  const { media_info, downloads, download_url, thumbnail, title, type, download_id } = response;
  
  let mediaType = type || media_info?.media_type || 'unknown';
  let downloadUrls = {};
  let thumbnailUrl = thumbnail || media_info?.thumbnail_url;
  
  // Normalize media types
  if (mediaType === 'image' || mediaType === 'photo') {
    mediaType = 'image';
  } else if (mediaType === 'carousel' || mediaType === 'album') {
    mediaType = 'carousel';
  } else if (mediaType === 'video' || mediaType === 'reel') {
    mediaType = 'video';
  }
  
  // Build download URLs cleanly based on unified types
  if (mediaType === 'carousel' || downloads) {
    const items = [];
    
    if (Array.isArray(downloads)) {
      downloads.forEach((item, index) => {
        const urlStr = typeof item === 'string' ? item : item.url;
        const isVideo = urlStr.includes('.mp4') || urlStr.includes('video');
        items.push({
          url: urlStr,
          type: isVideo ? 'video' : 'image',
          filename: generateFilename(platform, media_info, urlStr, isVideo ? 'video' : 'image')
        });
      });
    } else if (downloads && typeof downloads === 'object') {
      Object.entries(downloads).forEach(([key, url]) => {
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
    if (mediaType === 'video' || (download_url && download_url.includes('.mp4'))) {
      mediaType = 'video';
      downloadUrls = {
        videoHD: download_url || media_info?.download_url || media_info?.url,
        videoSD: download_url || media_info?.download_url || media_info?.url,
        audio: media_info?.audio_bitrate || response.audio_url ? (response.audio_url || `${download_url}?audio=1`) : null,
        thumbnail: thumbnailUrl
      };
    } else {
      mediaType = 'image';
      downloadUrls = {
        image: media_info?.url || download_url,
        thumbnail: thumbnailUrl || media_info?.url
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

/**
 * Generate filename for downloaded content
 */
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
  
  const platformPrefix = platform.charAt(0).toUpperCase() + platform.slice(1);
  const typeLabel = type === 'video' ? 'Video' : 'Photo';
  
  return `${platformPrefix}_${safeUsername}_${date}_${typeLabel}.${extension}`;
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

/**
 * Check if a URL is valid for download
 */
export const validateDownloadUrl = (url, platform = 'instagram') => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.length < 10) {
    return { valid: false, error: 'URL is too short' };
  }
  
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
    pinterest: /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.com|pin\.it)\/.+/i,
    reddit: /^https?:\/\/(www\.)?(reddit\.com|redd\.it)\/.+/i
  };
  
  const pattern = patterns[platform.toLowerCase()];
  if (pattern && !pattern.test(trimmedUrl)) {
    return { valid: false, error: `Please enter a valid ${platform} URL` };
  }
  
  return { valid: true, url: trimmedUrl };
};

/**
 * Batch download multiple URLs
 */
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

const downloader = {
  download: downloadFromUrl,
  saveToGallery,
  saveMultiple: saveMultipleToGallery,
  validate: validateDownloadUrl,
  batch: batchDownload
};

export default downloader;