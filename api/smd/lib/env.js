import { publicError } from "./errors.js";

const DEFAULT_UPSTREAM_BASE_URL = "https://api.downloaddash.store";

export function normalizeUpstreamBaseUrl(value) {
  let normalized = String(value || DEFAULT_UPSTREAM_BASE_URL)
    .trim()
    .replace(/\/+$/, "");

  normalized = normalized.replace(/\/api\/smd$/i, "");
  normalized = normalized.replace(/\/api\/v1$/i, "");
  normalized = normalized.replace(/\/api$/i, "");
  normalized = normalized.replace(/\/smd$/i, "");

  return normalized || DEFAULT_UPSTREAM_BASE_URL;
}

export function getServerEnv() {
  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || "").trim();
  if (!apiKey) {
    throw publicError(
      "SERVICE_CONFIGURATION_ERROR",
      503,
      "DOWNLOADDASH_API_KEY is missing from the server environment"
    );
  }

  return {
    apiKey,
    upstreamBaseUrl: normalizeUpstreamBaseUrl(process.env.SMD_API_BASE_URL),
  };
}
