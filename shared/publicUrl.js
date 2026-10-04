const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mibextid",
  "si",
  "spm",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

const PLATFORM_HOSTS = {
  tiktok: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  instagram: ["instagram.com", "www.instagram.com", "m.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "web.facebook.com", "fb.watch"],
  pinterest: ["pinterest.com", "www.pinterest.com", "pin.it"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  reddit: ["reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com", "m.reddit.com", "redd.it"],
  x: ["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
};

const PRIVATE_HOSTS = new Set(["localhost", "metadata.google.internal"]);

const stripCopiedUrlNoise = (value = "") => {
  let clean = String(value || "").trim();
  clean = clean.replace(/^["'`<\s]+|["'`>\s]+$/g, "");
  clean = clean.replace(/\\n|\\r|\\t/g, "");
  clean = clean.replace(/[\r\n\t]+/g, "");
  clean = clean.replace(/&amp;/gi, "&");
  clean = clean.replace(/\\\//g, "/");
  if (!/^https?:\/\//i.test(clean)) {
    try {
      const decoded = decodeURIComponent(clean);
      if (/^https?:\/\//i.test(decoded)) clean = decoded;
    } catch {
      // Keep the original copied text when it is not safely URI-encoded.
    }
  }
  return clean.trim();
};

const hostnameLooksPrivate = (hostname) => {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (PRIVATE_HOSTS.has(host)) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host === "169.254.169.254") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b, c, d] = ipv4.slice(1).map(Number);
  if ([a, b, c, d].some((part) => part < 0 || part > 255)) return true;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

export const platformHosts = PLATFORM_HOSTS;

export const isPlatformHost = (platform, hostname) => {
  const normalized = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (platform === "facebook") {
    return normalized === "fb.watch" || normalized === "facebook.com" || normalized.endsWith(".facebook.com");
  }
  if (platform === "pinterest") {
    return normalized === "pin.it" || normalized === "pinterest.com" || normalized.endsWith(".pinterest.com");
  }
  return (PLATFORM_HOSTS[platform] || []).includes(normalized);
};

export const detectPlatformFromNormalizedUrl = (url) => {
  const parsed = new URL(url);
  for (const platform of Object.keys(PLATFORM_HOSTS)) {
    if (isPlatformHost(platform, parsed.hostname)) return platform;
  }
  return null;
};

// Path validation shared by the UI and server proxy. Host validation alone
// accepts profile/search pages that cannot identify a media item.
export const isPlatformMediaUrl = (url, platform) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const path = parsed.pathname || "/";
  if (!isPlatformHost(platform, host)) return false;

  switch (platform) {
    case "tiktok":
      return ["vm.tiktok.com", "vt.tiktok.com"].includes(host)
        ? path.length > 1
        : /^\/@[^/]+\/(video|photo)\/[^/]+/i.test(path);
    case "youtube":
      return host === "youtu.be"
        ? path.length > 1
        : (path === "/watch" && Boolean(parsed.searchParams.get("v")))
          || /^\/(shorts|live)\/[^/]+/i.test(path);
    case "reddit":
      return host === "redd.it"
        ? path.length > 1
        : /^\/r\/[^/]+\/(s\/[^/]+|comments\/[^/]+)/i.test(path);
    case "instagram":
      return /^\/(p|reel|reels|stories|tv)\//i.test(path);
    case "x":
      return /\/status\/\d+/i.test(path);
    case "pinterest":
      return host === "pin.it" ? path.length > 1 : /^\/pin\/\d+/i.test(path);
    case "facebook":
      return /^\/(share\/(p|v)|reel|watch|stories|story\.php|photo|photo\.php|permalink\.php|posts|videos)\b/i.test(path)
          || /^\/[^/]+\/(videos|posts)\/[^/]+(?:\/\d+)?\/?$/i.test(path)
        || parsed.searchParams.has("v")
        || parsed.searchParams.has("story_fbid")
        || parsed.searchParams.has("fbid");
    default:
      return path.length > 1 || parsed.search.length > 1;
  }
};

export const normalizePublicUrl = (rawUrl, { platform = null, requireSupported = false } = {}) => {
  const clean = stripCopiedUrlNoise(rawUrl);
  if (!clean) {
    return { ok: false, code: "URL_REQUIRED", message: "Paste a link to download." };
  }

  let parsed;
  try {
    parsed = new URL(clean);
  } catch {
    return { ok: false, code: "INVALID_URL", message: "Enter a valid link for this downloader." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "UNSUPPORTED_PROTOCOL", message: "Only HTTP and HTTPS links are supported." };
  }

  if (parsed.username || parsed.password || parsed.port) {
    return { ok: false, code: "INVALID_URL", message: "Enter a public platform link without embedded credentials or a custom port." };
  }

  parsed.hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (hostnameLooksPrivate(parsed.hostname)) {
    return { ok: false, code: "BLOCKED_HOST", message: "Paste a public platform link." };
  }

  const detectedPlatform = detectPlatformFromNormalizedUrl(parsed.toString());
  if (requireSupported && !detectedPlatform) {
    return { ok: false, code: "UNSUPPORTED_DOMAIN", message: "Paste a link from a supported platform." };
  }

  if (platform && !isPlatformHost(platform, parsed.hostname)) {
    return { ok: false, code: "UNSUPPORTED_DOMAIN", message: `Paste a ${platform} link.` };
  }

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) parsed.searchParams.delete(key);
  }

  return {
    ok: true,
    url: parsed.toString(),
    platform: detectedPlatform,
    hostname: parsed.hostname,
  };
};
