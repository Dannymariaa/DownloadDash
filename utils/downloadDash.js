// utils/downloadDash.js

const DEFAULT_API_BASE_URL = "/api/smd";
const REQUEST_TIMEOUT_MS = 30000;

const PLATFORM_MAP = {
  "youtube": "youtube",
  "instagram": "instagram",
  "tiktok": "tiktok",
  "facebook": "facebook",
  "pinterest": "pinterest",
  "reddit": "reddit",
  "x": "x",
  "twitter": "x",
  "telegram": "telegram",
  "whatsappbusiness": "whatsapp_business",
  "whatsapp_business": "whatsapp_business"
};

// --- FIX: Get API base URL from multiple sources ---
const getApiBaseUrl = function() {
  // Try multiple sources for the API base URL
  const raw = import.meta?.env?.VITE_SMD_API_BASE_URL || 
              import.meta?.env?.NEXT_PUBLIC_API_URL ||
              import.meta?.env?.VITE_API_BASE_URL ||
              DEFAULT_API_BASE_URL;
  
  const normalized = String(raw).replace(/\/+$/, "") || DEFAULT_API_BASE_URL;
  return normalized;
};

// --- FIX: Build headers with DOWNLOADDASH_API_KEY ---
const buildHeaders = function() {
  const headers = { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  // Try to get API key from environment
  const apiKey = import.meta?.env?.DOWNLOADDASH_API_KEY || 
                 import.meta?.env?.VITE_DOWNLOADDASH_API_KEY || 
                 import.meta?.env?.NEXT_PUBLIC_DOWNLOADDASH_API_KEY ||
                 "";

  if (apiKey && apiKey.trim() !== "") {
    headers["DOWNLOADDASH_API_KEY"] = apiKey.trim();
    headers["Authorization"] = "Bearer " + apiKey.trim();
  }

  return headers;
};

const absolutizeApiUrl = function(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!url.startsWith("/")) return getApiBaseUrl() + "/" + url;
  return getApiBaseUrl() + url;
};

// --- FIX: Improved postJson with better error handling ---
const postJson = async function(path, body) {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl + path;
  
  console.log("[DownloadDash] POST to:", fullUrl);
  
  let res;
  try {
    res = await fetch(fullUrl, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("[DownloadDash] Network error:", error);
    throw new Error(
      "Unable to reach the DownloadDash API proxy at " + baseUrl + ". " +
      "Check that the Vercel deployment is live and that server-side DOWNLOADDASH_API_KEY is configured."
    );
  }

  console.log("[DownloadDash] Response status:", res.status);

  // --- FIX: Read response as text first ---
  let responseText;
  try {
    responseText = await res.text();
  } catch {
    throw new Error("Failed to read response from server");
  }

  // --- FIX: Handle empty responses ---
  if (!responseText || responseText.trim() === "") {
    if (res.status === 404) {
      throw new Error("API endpoint not found. Please check your API configuration.");
    }
    if (res.status === 403) {
      throw new Error("API authentication failed. Please check your DOWNLOADDASH_API_KEY.");
    }
    if (res.status === 401) {
      throw new Error("Unauthorized. Invalid DOWNLOADDASH_API_KEY.");
    }
    throw new Error("Server returned an empty response (" + res.status + ")");
  }

  // --- FIX: Parse JSON with error handling ---
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("[DownloadDash] JSON Parse Error:", parseError);
    console.log("[DownloadDash] Raw response:", responseText.substring(0, 500));
    
    // Check if it's HTML (common 404 page)
    if (responseText.toLowerCase().includes("<!doctype html") || 
        responseText.toLowerCase().includes("<html")) {
      throw new Error("API returned HTML instead of JSON. The endpoint may not exist.");
    }
    
    throw new Error("Invalid response format from server. Expected JSON.");
  }

  // --- FIX: Better error handling for non-OK responses ---
  if (!res.ok) {
    const errorMessage = data?.detail || data?.error || data?.message || "";
    
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        errorMessage || "DownloadDash API authentication failed. Check your DOWNLOADDASH_API_KEY."
      );
    }
    if (res.status === 404) {
      throw new Error(
        errorMessage || "API endpoint not found (" + res.status + "). Please check your API configuration."
      );
    }
    if (res.status === 429) {
      throw new Error(
        errorMessage || "Rate limit exceeded. Please try again later."
      );
    }
    if (res.status >= 500) {
      throw new Error(
        errorMessage || "Server error (" + res.status + "). Please try again later."
      );
    }
    
    throw new Error(errorMessage || "Request failed (" + res.status + ")");
  }
  
  return data;
};

// --- FIX: Enhanced platform detection with more patterns ---
const detectPlatform = function(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    // YouTube
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    // Instagram
    if (hostname.includes("instagram.com")) return "instagram";
    // TikTok
    if (hostname.includes("tiktok.com")) return "tiktok";
    // Facebook
    if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) return "facebook";
    // Pinterest
    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) return "pinterest";
    // Reddit
    if (hostname.includes("reddit.com") || hostname.includes("redd.it")) return "reddit";
    // X/Twitter
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "x";
    // Telegram
    if (hostname.includes("t.me") || hostname.includes("telegram.me") || hostname.includes("telegram.org")) return "telegram";
    
    return null;
  } catch {
    return null;
  }
};

// --- FIX: Improved resolveViaApi with better error handling ---
const resolveViaApi = async function({ url, platform, quality, extractAudio }) {
  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error("Please provide a valid URL.");
  }

  // Detect platform
  const detectedPlatform = platform || detectPlatform(url);
  if (!detectedPlatform) {
    throw new Error("Could not detect platform. Please specify a platform (youtube, instagram, tiktok, etc.)");
  }

  // Map platform to correct name
  const mappedPlatform = PLATFORM_MAP[detectedPlatform] || detectedPlatform;
  const apiPath = "/api/smd/" + mappedPlatform + "/download";
  
  if (!mappedPlatform || mappedPlatform === "undefined") {
    throw new Error("Unsupported platform: " + detectedPlatform);
  }

  const payload = {
    url: url,
    quality: quality || "highest",
    extract_audio: !!extractAudio,
    include_metadata: true
  };

  console.log("[DownloadDash] Resolving:", {
    platform: mappedPlatform,
    apiPath: apiPath,
    quality: payload.quality,
    extractAudio: payload.extract_audio
  });

  let data;
  try {
    data = await postJson(apiPath, payload);
  } catch (error) {
    // --- FIX: Better error messages ---
    if (error.message.includes("authentication") || error.message.includes("API key") || error.message.includes("DOWNLOADDASH_API_KEY")) {
      throw new Error(
        "API authentication failed. Please check your DOWNLOADDASH_API_KEY in Vercel environment variables."
      );
    }
    if (error.message.includes("404") || error.message.includes("not found")) {
      throw new Error(
        "Platform \"" + detectedPlatform + "\" endpoint not found. Please check your API configuration."
      );
    }
    if (error.message.includes("empty response")) {
      throw new Error("Server returned an empty response. Please try again.");
    }
    throw error;
  }

  // Check for API error response
  if (data?.success === false) {
    const message = data?.error || data?.message || "Resolve failed";
    throw new Error(message);
  }

  // --- FIX: Extract data with better fallbacks ---
  const downloads = data?.downloads || {};
  const mediaInfo = data?.media_info || {};
  
  const videoHD = downloads.videoHD || downloads.video || null;
  const videoSD = downloads.videoSD || downloads.video || null;
  const audio = downloads.audio || downloads.audio_url || null;
  const image = downloads.image || downloads.image_url || null;
  
  const title = mediaInfo.title || data?.title || "DownloadDash Media";
  const thumbnail = mediaInfo.thumbnail_url || mediaInfo.preview_url || data?.thumbnail_url || null;
  
  // Get primary download URL based on preferences
  const primaryUrl = extractAudio ? (audio || videoHD || videoSD) : (videoHD || videoSD || audio || image || data?.download_url);

  if (!primaryUrl) {
    console.error("[DownloadDash] No download URL found in response:", data);
    throw new Error("No downloadable URL found for this content.");
  }

  return {
    success: true,
    platform: mappedPlatform,
    title: title,
    thumbnail: absolutizeApiUrl(thumbnail),
    type: mediaInfo.media_type || "video",
    downloads: {
      videoHD: absolutizeApiUrl(videoHD),
      videoSD: absolutizeApiUrl(videoSD),
      audio: absolutizeApiUrl(audio),
      image: absolutizeApiUrl(image || thumbnail)
    },
    primaryUrl: absolutizeApiUrl(primaryUrl),
    originalUrl: url,
    raw: data
  };
};

// --- FIX: Export with better structure ---
const downloadDash = {
  download: async function(platform, params) {
    if (!platform) {
      throw new Error("Platform is required (youtube, instagram, tiktok, etc.)");
    }
    
    const { url, quality, extractAudio } = params || {};
    if (!url) {
      throw new Error("URL is required");
    }
    
    return resolveViaApi({ 
      url: url, 
      platform: platform, 
      quality: quality, 
      extractAudio: extractAudio 
    });
  },
  detectPlatform: detectPlatform,
  resolveViaApi: resolveViaApi,
  // --- FIX: Add helper to validate URL ---
  validateUrl: function(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: "URL is required" };
    }
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith('http')) {
        return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
      }
      const platform = detectPlatform(url);
      return { 
        valid: true, 
        platform: platform,
        message: platform ? "Valid URL" : "URL detected but platform not recognized"
      };
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }
};

export default downloadDash;