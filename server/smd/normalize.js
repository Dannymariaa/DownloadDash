import { publicError } from "./errors.js";

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value) return value;
  }
  return null;
}

const TYPE_ALIASES = {
  photo: "image",
  picture: "image",
  img: "image",
  image: "image",
  video: "video",
  movie: "video",
  audio: "audio",
  music: "audio",
  sound: "audio",
};

function normalizeType(value) {
  const normalized = String(value || "").toLowerCase();
  return TYPE_ALIASES[normalized] || "";
}

function inferTypeFromUrl(url = "") {
  const clean = String(url).split("?")[0].toLowerCase();
  if (/\.(mp3|m4a|aac|wav|ogg|opus)$/.test(clean)) return "audio";
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|mov|mkv|m3u8|m4v)$/.test(clean)) return "video";
  return "";
}

function inferTypeFromMime(mimeType = "") {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/") || normalized === "application/vnd.apple.mpegurl") return "video";
  if (normalized.startsWith("audio/")) return "audio";
  return "";
}

function inferType(entry, url, key = "") {
  const explicit = normalizeType(entry.type || entry.media_type || entry.mediaType || entry.kind);
  if (explicit) return explicit;

  const mimeType = firstValue(entry, ["mimeType", "mime_type", "contentType", "content_type", "mimetype"]);
  const mime = inferTypeFromMime(mimeType);
  if (mime) return mime;

  if (entry.is_video === true || entry.isVideo === true || entry.video_url || entry.videoUrl || entry.video) return "video";
  if (entry.is_video === false || entry.isVideo === false || entry.image_url || entry.imageUrl || entry.display_url || entry.displayUrl) return "image";
  if (entry.audio_url || entry.audioUrl || entry.music_url || entry.musicUrl || entry.sound_url || entry.soundUrl) return "audio";

  const keyType = normalizeType(qualityFromKey(key));
  if (keyType === "image" || keyType === "audio") return keyType;

  const extensionType = inferTypeFromUrl(url);
  if (extensionType) return extensionType;

  return "unknown";
}

function inferFormat(url = "") {
  const match = String(url).split("?")[0].toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1];
}

function inferFormatFromMime(mimeType = "") {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  const subtype = normalized.split("/")[1];
  if (!subtype) return undefined;
  if (subtype === "jpeg") return "jpg";
  if (subtype === "mpegurl" || normalized === "application/vnd.apple.mpegurl") return "m3u8";
  return subtype.replace(/^x-/, "");
}

function qualityFromKey(key = "") {
  const normalized = key.toLowerCase();
  if (normalized.includes("hd")) return "hd";
  if (normalized.includes("sd")) return "sd";
  if (normalized.includes("audio")) return "audio";
  if (normalized.includes("image")) return "image";
  if (normalized.includes("photo")) return "image";
  return undefined;
}

function mediaIdentity(entry, url) {
  const id = firstValue(entry, ["id", "media_id", "mediaId", "pk"]);
  return id ? `id:${id}:${url}` : `url:${url}`;
}

function primaryUrlForEntry(entry, key = "") {
  const explicitType = normalizeType(entry.type || entry.media_type || entry.mediaType || entry.kind);
  if (explicitType === "video" || entry.is_video === true || entry.isVideo === true) {
    return firstValue(entry, ["video_url", "videoUrl", "video", "url", "download_url", "downloadUrl", "media_url", "mediaUrl", "play_url", "playUrl", "src"]);
  }
  if (explicitType === "image" || entry.is_video === false || entry.isVideo === false || qualityFromKey(key) === "image") {
    return firstValue(entry, ["image_url", "imageUrl", "display_url", "displayUrl", "url", "download_url", "downloadUrl", "media_url", "mediaUrl", "src"]);
  }
  if (explicitType === "audio" || qualityFromKey(key) === "audio") {
    return firstValue(entry, ["audio_url", "audioUrl", "music_url", "musicUrl", "sound_url", "soundUrl", "audio", "url", "download_url", "downloadUrl", "media_url", "mediaUrl", "src"]);
  }
  return firstValue(entry, ["url", "download_url", "downloadUrl", "media_url", "mediaUrl", "video_url", "videoUrl", "image_url", "imageUrl", "display_url", "displayUrl", "play_url", "playUrl", "src"]);
}

function pushMedia(media, seen, item, key = "") {
  const entry = typeof item === "string" ? { url: item } : item || {};
  const url = primaryUrlForEntry(entry, key);
  if (!url) return;
  const identity = mediaIdentity(entry, url);
  if (seen.has(identity)) return;
  seen.add(identity);

  const mimeType = firstValue(entry, ["mimeType", "mime_type", "contentType", "content_type", "mimetype"]);
  const type = inferType(entry, url, key);
  const normalized = {
    index: media.length,
    type,
    url,
  };
  const quality = entry.quality || qualityFromKey(key);
  const format = entry.format || entry.extension || inferFormatFromMime(mimeType) || inferFormat(url);
  if (quality) normalized.quality = quality;
  if (mimeType) normalized.mimeType = mimeType;
  if (format) normalized.format = format;
  if (entry.width) normalized.width = entry.width;
  if (entry.height) normalized.height = entry.height;
  if (entry.hasAudio !== undefined || entry.has_audio !== undefined) normalized.hasAudio = Boolean(entry.hasAudio ?? entry.has_audio);
  if (entry.audioUrl || entry.audio_url) normalized.audioUrl = entry.audioUrl || entry.audio_url;
  if (entry.thumbnail || entry.thumbnail_url) normalized.thumbnail = entry.thumbnail || entry.thumbnail_url;
  media.push(normalized);
}

function collectNestedMediaCollections(source, depth = 0) {
  if (!source || typeof source !== "object" || depth > 5) return [];
  const collections = [];
  for (const key of ["media", "medias", "items", "images", "photos", "photo", "carousel", "resources", "variants", "children"]) {
    const value = source[key];
    if (Array.isArray(value)) collections.push(...value);
  }
  const edges = source?.edge_sidecar_to_children?.edges || source?.edges;
  if (Array.isArray(edges)) collections.push(...edges);
  for (const key of ["media_info", "mediaInfo", "shortcode_media", "graphql", "data", "post", "legacy", "extended_entities"]) {
    collections.push(...collectNestedMediaCollections(source[key], depth + 1));
  }
  return collections;
}

function collectMedia(upstreamData) {
  const media = [];
  const seen = new Set();
  const downloads = upstreamData?.downloads || {};

  for (const [key, value] of Object.entries(downloads)) {
    if (Array.isArray(value)) {
      value.forEach((item) => pushMedia(media, seen, item, key));
    } else if (typeof value === "string") {
      pushMedia(media, seen, { url: value, quality: qualityFromKey(key) }, key);
    }
  }

  for (const key of ["media", "medias", "items", "images", "photos", "photo", "carousel", "variants", "resources"]) {
    const value = upstreamData?.[key];
    if (Array.isArray(value)) value.forEach((item) => pushMedia(media, seen, item, key));
  }

  collectNestedMediaCollections(upstreamData).forEach((item) => pushMedia(media, seen, item));

  const direct = firstValue(upstreamData, ["download_url", "downloadUrl", "url", "direct_url"]);
  if (direct) pushMedia(media, seen, { url: direct }, "direct");

  return media;
}

export function normalizeDownloadResponse(platform, upstreamData) {
  if (!upstreamData || typeof upstreamData !== "object") {
    throw publicError("UPSTREAM_INVALID_RESPONSE", 502, "upstream JSON was not an object");
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
