import { publicError } from "./errors.js";
import { PLATFORM_HOSTS, isPlatformHost, normalizePlatform } from "./platforms.js";
import { isPlatformMediaUrl, normalizePublicUrl } from "../../shared/publicUrl.js";

const MAX_BODY_BYTES = 20_000;
export const FREE_BATCH_URL_LIMIT = 1;
export const PRO_BATCH_URL_LIMIT = 7;
const TIKTOK_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const REDDIT_SHORT_HOSTS = new Set(["redd.it"]);
const TIKTOK_MEDIA_HOSTS = ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "muscdn.com", "byteoversea.com"];
const SHORT_LINK_TIMEOUT_MS = 6_000;
const SHORT_LINK_REDIRECT_LIMIT = 5;

export function parseBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return {};
  if (req.body === undefined || req.body === null || req.body === "") return {};

  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > MAX_BODY_BYTES) throw publicError("PAYLOAD_TOO_LARGE", 413);
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      throw publicError("INVALID_JSON", 400);
    }
  }

  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_BODY_BYTES) throw publicError("PAYLOAD_TOO_LARGE", 413);
    try {
      return JSON.parse(req.body);
    } catch {
      throw publicError("INVALID_JSON", 400);
    }
  }

  const serialized = JSON.stringify(req.body);
  if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) throw publicError("PAYLOAD_TOO_LARGE", 413);
  return req.body;
}

export function validatePublicUrl(rawUrl, platform = null) {
  const normalized = normalizePublicUrl(rawUrl, { platform });
  if (!normalized.ok) throw publicError(normalized.code, 400, normalized.message);
  return normalized.url;
}

function isPlatformShortUrl(url, platform) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:") return false;
    if (platform === "tiktok") return TIKTOK_SHORT_HOSTS.has(hostname);
    if (platform === "reddit") return REDDIT_SHORT_HOSTS.has(hostname) || /^\/r\/[^/]+\/s\/[^/]+\/?$/i.test(parsed.pathname);
    return false;
  } catch {
    return false;
  }
}

function redirectLocation(currentUrl, location) {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    throw publicError("INVALID_URL", 400, "short-link redirect location was invalid");
  }
}

async function fetchPlatformRedirect(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHORT_LINK_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function normalizeDownloadUrl(rawUrl, platform = null) {
  let url = validatePublicUrl(rawUrl, platform);
  if (!new Set(["tiktok", "reddit"]).has(platform) || !isPlatformShortUrl(url, platform)) return url;

  let current = url;
  for (let redirects = 0; redirects < SHORT_LINK_REDIRECT_LIMIT; redirects += 1) {
    const parsed = new URL(current);
    if (parsed.protocol !== "https:") {
      throw publicError("UNSUPPORTED_PROTOCOL", 400, "Short-link redirects must remain HTTPS");
    }
    if (!isPlatformHost(platform, parsed.hostname)) {
      throw publicError("UNSUPPORTED_DOMAIN", 400, `Short-link redirected to ${parsed.hostname}`);
    }

    let response;
    try {
      response = await fetchPlatformRedirect(current);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw publicError("UPSTREAM_TIMEOUT", 504, "Short-link expansion timed out");
      }
      throw publicError("UPSTREAM_UNAVAILABLE", 503, "Short-link expansion failed");
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = validatePublicUrl(redirectLocation(current, location), platform);
      if (!isPlatformShortUrl(current, platform)) return current;
      continue;
    }

    return validatePublicUrl(current, platform);
  }

  throw publicError("INVALID_URL", 400, "Short-link redirect limit exceeded");
}

export async function validateDownloadRequest(platform, req) {
  const body = parseBody(req);
  const url = await normalizeDownloadUrl(body?.url, platform);
  if (!isPlatformMediaUrl(url, platform)) {
    throw publicError("INVALID_URL", 400, "Paste a public media link for this downloader.");
  }

  return {
    url,
    quality: body?.quality || "highest",
    extract_audio: Boolean(body?.extract_audio || body?.extractAudio),
    include_metadata: body?.include_metadata !== false,
  };
}

export function detectPlatformFromPublicUrl(url) {
  const parsed = new URL(validatePublicUrl(url));
  for (const platform of Object.keys(PLATFORM_HOSTS)) {
    if (isPlatformHost(platform, parsed.hostname)) return platform;
  }
  return null;
}

function batchErrorEntry(index, rawUrl, error) {
  return {
    index,
    url: String(rawUrl || ""),
    platform: null,
    status: "failed",
    error: {
      code: error?.code || "INVALID_URL",
      message: error?.message || "Enter a valid URL.",
    },
  };
}

function uniqueBatchEntries(body) {
  const rawUrls = Array.isArray(body?.urls)
    ? body.urls
    : String(body?.urls || body?.url || "")
        .split(/\s+/)
        .filter(Boolean);
  const seen = new Set();
  const entries = [];
  const invalidItems = [];
  let duplicateUrlsRemoved = 0;

  for (const [sourceIndex, rawUrl] of rawUrls.entries()) {
    try {
      const url = validatePublicUrl(rawUrl);
      const platform = detectPlatformFromPublicUrl(url);
      if (!platform || !isPlatformMediaUrl(url, platform)) {
        throw publicError("INVALID_URL", 400, "Paste a public media link from a supported platform.");
      }
      if (seen.has(url)) {
        duplicateUrlsRemoved += 1;
        continue;
      }
      seen.add(url);
      entries.push({ index: entries.length + invalidItems.length, sourceIndex, url });
    } catch (error) {
      invalidItems.push(batchErrorEntry(entries.length + invalidItems.length, rawUrl, error));
    }
  }

  return { entries, invalidItems, duplicateUrlsRemoved };
}

export function validateBatchDownloadRequest(req, { maxUrls = FREE_BATCH_URL_LIMIT } = {}) {
  const body = parseBody(req);
  const parsed = uniqueBatchEntries(body);
  const retryOnly = Boolean(body?.retryFailed);
  const failedUrlSet = new Set(
    (Array.isArray(body?.failedUrls) ? body.failedUrls : [])
      .map((url) => validatePublicUrl(url))
  );
  const entries = retryOnly && failedUrlSet.size
    ? parsed.entries.filter((entry) => failedUrlSet.has(entry.url))
    : parsed.entries;
  const invalidItems = retryOnly ? [] : parsed.invalidItems;

  if (!entries.length && !invalidItems.length) throw publicError("URL_REQUIRED", 400);
  if (!entries.length) throw publicError("INVALID_URL", 400);
  if (entries.length + invalidItems.length > maxUrls) {
    throw publicError(maxUrls === FREE_BATCH_URL_LIMIT ? "PRO_UPGRADE_REQUIRED" : "BATCH_LIMIT_EXCEEDED", maxUrls === FREE_BATCH_URL_LIMIT ? 402 : 400);
  }

  const items = [];
  for (const entry of entries) {
    const platform = detectPlatformFromPublicUrl(entry.url);
    if (!platform) {
      invalidItems.push(batchErrorEntry(entry.index, entry.url, publicError("UNSUPPORTED_DOMAIN", 400, `unsupported batch URL ${entry.url}`)));
      continue;
    }
    if (!isPlatformMediaUrl(entry.url, platform)) {
      invalidItems.push(batchErrorEntry(entry.index, entry.url, publicError("INVALID_URL", 400, "Paste a public media link from a supported platform.")));
      continue;
    }
    const url = validatePublicUrl(entry.url, platform);
    items.push({
      index: entry.index,
      sourceIndex: entry.sourceIndex,
      url,
      platform,
      quality: body?.quality || "highest",
      extract_audio: Boolean(body?.extract_audio || body?.extractAudio),
      include_metadata: body?.include_metadata !== false,
    });
  }

  if (!items.length) {
    const firstError = invalidItems[0]?.error;
    throw publicError(firstError?.code || "UNSUPPORTED_DOMAIN", 400, firstError?.message);
  }

  return {
    items,
    invalidItems,
    duplicateUrlsRemoved: parsed.duplicateUrlsRemoved,
    retryFailed: retryOnly,
  };
}

export function validateFileProxyRequest(req) {
  const body = parseBody(req);
  const rawUrl = body?.url || req.query?.url;
  const rawSourceUrl =
    body?.sourceUrl ||
    body?.source_url ||
    req.query?.sourceUrl ||
    req.query?.source_url ||
    req.query?.url;
  let sourceUrl;
  let url;
  try {
    sourceUrl = validatePublicUrl(rawSourceUrl);
    url = rawUrl ? validatePublicUrl(rawUrl) : undefined;
  } catch (error) {
    if (error?.code === 'URL_REQUIRED' || error?.code === 'INVALID_URL') {
      throw publicError('INVALID_FILE_REQUEST', 400);
    }
    throw error;
  }
  const source = new URL(sourceUrl);
  const trustedSource = Object.keys(PLATFORM_HOSTS).some((platform) => isPlatformHost(platform, source.hostname));
  if (!trustedSource) {
    throw publicError("UNSUPPORTED_DOMAIN", 400, `unsupported media source ${source.hostname}`);
  }
  if (url && isPlatformHost("tiktok", source.hostname)) {
    const media = new URL(url);
    const trustedTikTokCdn = media.protocol === "https:" &&
      !media.username && !media.password &&
      (media.port === "" || media.port === "443") &&
      TIKTOK_MEDIA_HOSTS.some((domain) => media.hostname === domain || media.hostname.endsWith(`.${domain}`));
    if (!trustedTikTokCdn) {
      throw publicError("UNSUPPORTED_DOMAIN", 400, "TikTok media URL host is not allowed");
    }
  }
  return { ...body, ...req.query, url, sourceUrl };
}

export function validateDiagnosticsRequest(req) {
  const platform = String(req.query?.platform || "").toLowerCase();
  const allowed = new Set(["instagram", "tiktok", "pinterest", "reddit", "youtube", "facebook", "x", "twitter"]);
  if (!allowed.has(platform)) {
    throw publicError("UNSUPPORTED_PLATFORM", 400, "unsupported diagnostics platform");
  }

  const payload = { platform };
  if (req.query?.url) payload.url = validatePublicUrl(String(req.query.url), platform === "twitter" ? "x" : platform);
  for (const key of ["probe_proxy", "run_resolver", "run_gallery"]) {
    const value = req.query?.[key];
    if (value === "1" || value === "true" || value === true) payload[key] = "true";
  }
  return payload;
}

export function parseRoute(parts) {
  if (!parts.length) {
    throw publicError("UNSUPPORTED_PLATFORM", 404, "proxy path missing");
  }

  const first = decodeURIComponent(parts[0]).toLowerCase();
  const second = parts[1] ? decodeURIComponent(parts[1]).toLowerCase() : "";

  if (first === "health" && !second) {
    return { kind: "health" };
  }

  if (first === "download" && second === "file") {
    return { kind: "file", forwardPath: ["download", "file"] };
  }

  if (first === "diagnostics" && second === "provider") {
    return { kind: "diagnostics", forwardPath: ["diagnostics", "provider"] };
  }

  if (first === "batch" && second === "download") {
    return { kind: "batch" };
  }

  if (first === "youtube" && second === "file") {
    return { kind: "file", forwardPath: ["youtube", "file"] };
  }

  const platform = normalizePlatform(first);
  if (!platform || second !== "download") {
    throw publicError("UNSUPPORTED_PLATFORM", 404, `unsupported route /${parts.join("/")}`);
  }

  return { kind: "download", platform };
}
