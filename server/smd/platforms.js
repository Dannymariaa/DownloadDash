export const PLATFORM_ALIASES = {
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  pinterest: "pinterest",
  reddit: "reddit",
  x: "x",
  twitter: "x",
};

export const UPSTREAM_PLATFORM = {
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  pinterest: "pinterest",
  reddit: "reddit",
  x: "twitter",
};

export const PLATFORM_HOSTS = {
  tiktok: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  instagram: ["instagram.com", "www.instagram.com", "m.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "web.facebook.com", "fb.watch"],
  pinterest: ["pinterest.com", "www.pinterest.com", "pin.it"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  reddit: ["reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com", "m.reddit.com", "redd.it"],
  x: ["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
};

export function normalizePlatform(value) {
  const key = String(value || "").toLowerCase();
  return PLATFORM_ALIASES[key] || null;
}

export function upstreamPlatform(platform) {
  return UPSTREAM_PLATFORM[platform] || platform;
}

export function isPlatformHost(platform, hostname) {
  const normalized = String(hostname || "").toLowerCase().replace(/\.$/, "");
  const allowed = PLATFORM_HOSTS[platform] || [];

  if (platform === "pinterest") {
    return normalized === "pin.it" || normalized === "pinterest.com" || normalized.endsWith(".pinterest.com");
  }

  return allowed.includes(normalized);
}
