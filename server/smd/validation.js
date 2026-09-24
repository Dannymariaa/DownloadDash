import { publicError } from "./errors.js";
import { PLATFORM_HOSTS, isPlatformHost, normalizePlatform } from "./platforms.js";

const MAX_BODY_BYTES = 20_000;
const PRIVATE_HOSTS = new Set(["localhost", "metadata.google.internal"]);

function hostnameLooksPrivate(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (PRIVATE_HOSTS.has(host)) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host === "169.254.169.254") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const parts = ipv4.slice(1).map(Number);
  if (parts.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

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
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw publicError("URL_REQUIRED", 400);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw publicError("INVALID_URL", 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw publicError("UNSUPPORTED_PROTOCOL", 400);
  }

  if (hostnameLooksPrivate(parsed.hostname)) {
    throw publicError("BLOCKED_HOST", 400, `blocked private host ${parsed.hostname}`);
  }

  if (platform && !isPlatformHost(platform, parsed.hostname)) {
    throw publicError("UNSUPPORTED_DOMAIN", 400, `wrong domain ${parsed.hostname} for ${platform}`);
  }

  return parsed.toString();
}

export function validateDownloadRequest(platform, req) {
  const body = parseBody(req);
  const url = validatePublicUrl(body?.url, platform);

  return {
    url,
    quality: body?.quality || "highest",
    extract_audio: Boolean(body?.extract_audio || body?.extractAudio),
    include_metadata: body?.include_metadata !== false,
  };
}

export function validateFileProxyRequest(req) {
  const body = parseBody(req);
  const url = validatePublicUrl(body?.url);
  const sourceUrl = validatePublicUrl(body?.sourceUrl);
  const source = new URL(sourceUrl);
  const trustedSource = Object.keys(PLATFORM_HOSTS).some((platform) => isPlatformHost(platform, source.hostname));
  if (!trustedSource) {
    throw publicError("UNSUPPORTED_DOMAIN", 400, `unsupported media source ${source.hostname}`);
  }
  return { ...body, url, sourceUrl };
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

  if (first === "youtube" && second === "file") {
    return { kind: "file", forwardPath: ["youtube", "file"] };
  }

  const platform = normalizePlatform(first);
  if (!platform || second !== "download") {
    throw publicError("UNSUPPORTED_PLATFORM", 404, `unsupported route /${parts.join("/")}`);
  }

  return { kind: "download", platform };
}
