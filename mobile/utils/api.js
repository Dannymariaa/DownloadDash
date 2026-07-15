// utils/downloadApi.js

import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://api.downloaddash.store';
const REQUEST_TIMEOUT_MS = 30000;

// Platform mapping for consistent naming
const PLATFORM_MAP = {
  'youtube': 'youtube',
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'facebook': 'facebook',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'twitter': 'x',
  'x': 'x',
  'telegram': 'telegram'
};

export const getApiBaseUrl = () => {
  try {
    const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
    const raw = extra.apiBaseUrl || DEFAULT_API_BASE_URL;
    return String(raw).replace(/\/+$/, '');
  } catch {
    return DEFAULT_API_BASE_URL;
  }
};

const getApiHeaders = () => {
  try {
    const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (extra.requireApiKey && extra.apiKey && extra.apiKey !== 'your_api_key_here') {
      const apiKey = String(extra.apiKey).trim();
      headers['X-API-Key'] = apiKey;
      headers['X-DownloadDash-Key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  } catch {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
};

const absolutizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/')) return `${getApiBaseUrl()}/${value.replace(/^\/+/, '')}`;
  return `${getApiBaseUrl()}${value}`;
};

export const detectPlatform = (rawUrl) => {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    // Instagram
    if (hostname.includes('instagram.com')) return 'instagram';
    // TikTok
    if (hostname.includes('tiktok.com')) return 'tiktok';
    // Facebook
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) return 'facebook';
    // Pinterest
    if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) return 'pinterest';
    // Reddit
    if (hostname.includes('reddit.com') || hostname.includes('redd.it')) return 'reddit';
    // X/Twitter
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'x';
    // Telegram
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
  try {
    const downloads = { ...(data?.downloads || {}) };

    // Handle different response formats
    if (!downloads.videoHD && downloads.video) downloads.videoHD = downloads.video;
    if (!downloads.videoSD && downloads.video) downloads.videoSD = downloads.video;
    if (!downloads.audio && downloads.audio_url) downloads.audio = downloads.audio_url;
    
    // Handle images
    if (!downloads.items && Array.isArray(downloads.images)) {
      downloads.items = downloads.images;
    }
    
    if (!downloads.image && data?.media_info?.download_url && data?.media_info?.media_type === 'image') {
      downloads.image = data.media_info.download_url;
    }

    // Handle items array
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

    // Get fallback URL
    let fallbackUrl = null;
    if (data?.download_url) {
      fallbackUrl = data.download_url;
    } else if (data?.media_info?.download_url) {
      fallbackUrl = data.media_info.download_url;
    } else if (data?.media_info?.preview_url) {
      fallbackUrl = data.media_info.preview_url;
    } else if (data?.media_info?.thumbnail_url) {
      fallbackUrl = data.media_info.thumbnail_url;
    }

    return {
      videoHD: absolutizeUrl(downloads.videoHD),
      videoSD: absolutizeUrl(downloads.videoSD),
      audio: absolutizeUrl(downloads.audio),
      image: absolutizeUrl(downloads.image),
      items,
      fallback: absolutizeUrl(fallbackUrl),
    };
  } catch (error) {
    console.error('Error normalizing downloads:', error);
    return {
      videoHD: null,
      videoSD: null,
      audio: null,
      image: null,
      items: [],
      fallback: null,
    };
  }
};

export const resolveDownload = async ({ 
  url, 
  quality = 'high', 
  extractAudio = false,
  timeout = REQUEST_TIMEOUT_MS 
}) => {
  // Validate input
  if (!url || typeof url !== 'string') {
    throw new Error('Please provide a valid URL.');
  }

  // Detect platform
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error('Paste a supported YouTube, Instagram, TikTok, Facebook, Pinterest, Reddit, X, or Telegram link.');
  }

  // Map platform to correct API endpoint
  const mappedPlatform = PLATFORM_MAP[platform] || platform;
  const apiUrl = `${getApiBaseUrl()}/api/smd/${mappedPlatform}/download`;

  console.log(`[DownloadDash] Resolving: ${platform} | ${apiUrl}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Make the request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        url,
        quality: mapQuality(quality),
        extract_audio: extractAudio,
        include_metadata: true,
      }),
      signal: controller.signal,
    });

    // Clear timeout
    clearTimeout(timeoutId);

    // --- FIX: Handle empty responses ---
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('The server returned an empty response. Please try again.');
    }

    // Parse JSON response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw response:', responseText.substring(0, 500));
      throw new Error('Invalid response format from server. Please try again.');
    }

    // --- FIX: Check for error responses ---
    if (!response.ok) {
      const errorMessage = data?.detail || data?.error || data?.message || `Request failed (${response.status})`;
      
      if (response.status === 401) {
        throw new Error('Unauthorized. Please check your API key configuration.');
      } else if (response.status === 404) {
        throw new Error(`Platform "${platform}" endpoint not found. Please check your API configuration.`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    // Check for success flag
    if (data?.success === false) {
      throw new Error(data?.error || data?.message || 'Download resolution failed.');
    }

    // --- FIX: Normalize downloads with better error handling ---
    const downloads = normalizeDownloads(data);
    
    // Determine primary URL based on preferences
    let primaryUrl = null;
    if (extractAudio) {
      primaryUrl = downloads.audio || downloads.fallback;
    } else {
      primaryUrl = downloads.videoHD || downloads.videoSD || downloads.image || downloads.audio || downloads.fallback;
    }

    // If no primary URL found, throw error
    if (!primaryUrl) {
      console.error('No download URL found in response:', data);
      throw new Error('No download URL found for this media. The platform may not support downloading this content.');
    }

    // --- FIX: Get thumbnail with fallback ---
    let thumbnailUrl = null;
    if (data?.media_info?.thumbnail_url) {
      thumbnailUrl = absolutizeUrl(data.media_info.thumbnail_url);
    } else if (data?.media_info?.preview_url) {
      thumbnailUrl = absolutizeUrl(data.media_info.preview_url);
    } else if (data?.thumbnail_url) {
      thumbnailUrl = absolutizeUrl(data.thumbnail_url);
    }

    // --- FIX: Get title with fallback ---
    let title = data?.media_info?.title || data?.title || 'DownloadDash Media';
    if (!title || title === 'DownloadDash Media') {
      // Try to extract from URL
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.length > 5) {
            title = `Media from ${platform}`;
          }
        }
      } catch {
        // Keep default title
      }
    }

    return {
      success: true,
      platform,
      title,
      mediaType: data?.media_info?.media_type || 'video',
      thumbnailUrl,
      sourceUrl: url,
      downloads,
      primaryUrl,
      metadata: data?.media_info || {},
      rawResponse: data, // Optional: for debugging
    };

  } catch (error) {
    // Clear timeout if it wasn't already
    clearTimeout(timeoutId);

    // --- FIX: Better error handling ---
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout/1000} seconds. Please try again.`);
    }

    // Handle network errors
    if (error?.message?.includes('Network request failed') || 
        error?.message?.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    // Re-throw with original message
    throw error;
  }
};

// --- FIX: Add helper for batch downloads ---
export const batchResolve = async (urls, options = {}) => {
  const results = [];
  const errors = [];

  for (const url of urls) {
    try {
      const result = await resolveDownload({ url, ...options });
      results.push(result);
    } catch (error) {
      errors.push({ url, error: error.message });
    }
  }

  return {
    results,
    errors,
    success: errors.length === 0,
    total: urls.length,
    successful: results.length,
    failed: errors.length,
  };
};

// --- FIX: Add validation helper ---
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    return { valid: true, platform: detectPlatform(url) };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

// --- FIX: Add platform info helper ---
export const getPlatformInfo = (platform) => {
  const info = {
    youtube: { name: 'YouTube', icon: 'youtube', color: '#FF0000' },
    instagram: { name: 'Instagram', icon: 'instagram', color: '#E4405F' },
    tiktok: { name: 'TikTok', icon: 'tiktok', color: '#000000' },
    facebook: { name: 'Facebook', icon: 'facebook', color: '#1877F2' },
    pinterest: { name: 'Pinterest', icon: 'pinterest', color: '#E60023' },
    reddit: { name: 'Reddit', icon: 'reddit', color: '#FF4500' },
    x: { name: 'X', icon: 'x', color: '#000000' },
    twitter: { name: 'Twitter', icon: 'twitter', color: '#1DA1F2' },
    telegram: { name: 'Telegram', icon: 'telegram', color: '#0088CC' },
  };
  return info[platform] || { name: platform, icon: 'link', color: '#666666' };
};