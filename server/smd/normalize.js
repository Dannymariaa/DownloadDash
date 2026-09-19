import { publicError } from "./errors.js";

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value) return value;
  }
  return null;
}

function inferType(url = "", fallback = "video") {
  const clean = String(url).split("?")[0].toLowerCase();
  if (/\.(mp3|m4a|aac|wav|ogg|opus)$/.test(clean)) return "audio";
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|mov|mkv|m3u8|m4v)$/.test(clean)) return "video";
  return fallback;
}

function inferFormat(url = "") {
  const match = String(url).split("?")[0].toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1];
}

function qualityFromKey(key = "") {
  const normalized = key.toLowerCase();
  if (normalized.includes("hd")) return "hd";
  if (normalized.includes("sd")) return "sd";
  if (normalized.includes("audio")) return "audio";
  if (normalized.includes("image")) return "image";
  return undefined;
}

function pushMedia(media, seen, item, key = "") {
  const entry = typeof item === "string" ? { url: item } : item || {};
  const url = firstValue(entry, ["url", "download_url", "downloadUrl", "media_url", "mediaUrl", "video", "audio", "image", "src"]);
  if (!url || seen.has(url)) return;
  seen.add(url);

  const type = String(entry.type || entry.media_type || entry.mediaType || inferType(url)).toLowerCase();
  const normalized = {
    type: type === "photo" ? "image" : type,
    url,
  };
  const quality = entry.quality || qualityFromKey(key);
  const format = entry.format || entry.extension || inferFormat(url);
  if (quality) normalized.quality = quality;
  if (format) normalized.format = format;
  if (entry.width) normalized.width = entry.width;
  if (entry.height) normalized.height = entry.height;
  if (entry.thumbnail || entry.thumbnail_url) normalized.thumbnail = entry.thumbnail || entry.thumbnail_url;
  media.push(normalized);
}

function collectMedia(upstreamData) {
  const media = [];
  const seen = new Set();
  const downloads = upstreamData?.downloads || {};

  for (const [key, value] of Object.entries(downloads)) {
    if (Array.isArray(value)) {
      value.forEach((item) => pushMedia(media, seen, item, key));
    } else if (typeof value === "string") {
      pushMedia(media, seen, { url: value, type: inferType(value), quality: qualityFromKey(key) }, key);
    }
  }

  for (const key of ["media", "medias", "items", "images", "photos", "variants"]) {
    const value = upstreamData?.[key];
    if (Array.isArray(value)) value.forEach((item) => pushMedia(media, seen, item, key));
  }

  const direct = firstValue(upstreamData, ["download_url", "downloadUrl", "url", "direct_url"]);
  if (direct) pushMedia(media, seen, { url: direct, type: inferType(direct) }, "direct");

  return media;
}

export function normalizeDownloadResponse(platform, upstreamData) {
  if (!upstreamData || typeof upstreamData !== "object") {
    throw publicError("UPSTREAM_INVALID_RESPONSE", 502, "upstream JSON was not an object");
  }

  if (upstreamData.success === false) {
    throw publicError("UNSUPPORTED_MEDIA", 422, "upstream returned success=false");
  }

  const media = collectMedia(upstreamData);
  if (!media.length) {
    throw publicError("UNSUPPORTED_MEDIA", 422, "upstream response contained no media URLs");
  }

  const mediaInfo = upstreamData.media_info || upstreamData.mediaInfo || {};
  const data = {};
  const title = firstValue(upstreamData, ["title"]) || firstValue(mediaInfo, ["title"]);
  const author = firstValue(upstreamData, ["author", "author_username", "author_display_name"]) ||
    firstValue(mediaInfo, ["author", "author_username", "author_display_name"]);
  const thumbnail = firstValue(upstreamData, ["thumbnail", "thumbnail_url", "preview_url"]) ||
    firstValue(mediaInfo, ["thumbnail", "thumbnail_url", "thumbnailUrl", "preview_url", "previewUrl"]);

  if (title) data.title = title;
  if (author) data.author = author;
  if (thumbnail) data.thumbnail = thumbnail;
  data.media = media;

  return {
    success: true,
    platform,
    data,
  };
}
