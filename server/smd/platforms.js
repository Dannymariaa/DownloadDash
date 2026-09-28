import { isPlatformHost, platformHosts } from "../../shared/publicUrl.js";

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
  ...platformHosts,
};

export function normalizePlatform(value) {
  const key = String(value || "").toLowerCase();
  return PLATFORM_ALIASES[key] || null;
}

export function upstreamPlatform(platform) {
  return UPSTREAM_PLATFORM[platform] || platform;
}

export { isPlatformHost };
