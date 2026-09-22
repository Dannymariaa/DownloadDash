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

export function getServerEnvDiagnostics() {
  const rawApiKey = String(process.env.DOWNLOADDASH_API_KEY || "").trim();
  const rawBaseUrl = String(process.env.SMD_API_BASE_URL || "").trim();
  const upstreamBaseUrl = normalizeUpstreamBaseUrl(rawBaseUrl);
  let upstreamHost = "";

  try {
    upstreamHost = new URL(upstreamBaseUrl).host;
  } catch {
    upstreamHost = "";
  }

  return {
    hasDownloadDashApiKey: Boolean(rawApiKey),
    apiKeyLength: rawApiKey.length,
    hasUpstreamBaseUrl: Boolean(rawBaseUrl),
    upstreamBaseUrl,
    upstreamHost,
    proxyConfigured: Boolean(rawApiKey && upstreamHost),
  };
}

export function getServerEnv() {
  const diagnostics = getServerEnvDiagnostics();
  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || "").trim();

  if (!diagnostics.proxyConfigured) {
    throw publicError(
      "SERVICE_CONFIGURATION_ERROR",
      503,
      diagnostics.hasDownloadDashApiKey
        ? "SMD_API_BASE_URL is invalid in the server environment"
        : "DOWNLOADDASH_API_KEY is missing from the server environment"
    );
  }

  return {
    apiKey,
    upstreamBaseUrl: diagnostics.upstreamBaseUrl,
    upstreamHost: diagnostics.upstreamHost,
  };
}
