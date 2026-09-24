import { publicError } from "./errors.js";
import { normalizeDownloadResponse } from "./normalize.js";
import { upstreamPlatform } from "./platforms.js";

const REQUEST_TIMEOUT_MS = 55_000;
const MAX_TRANSIENT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 40;

function sanitizeFilename(name) {
  return String(name || "download")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "download";
}

function buildHeaders(apiKey) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-DownloadDash-Key": apiKey,
  };
}

function isAuthFailure(status, data) {
  if (status === 401) return true;
  if (status !== 403) return false;

  const values = [
    data?.error,
    data?.code,
    data?.message,
    data?.detail,
  ].map((value) => String(value || "").toLowerCase());

  return values.some((value) => value === "auth_failed" || value.includes("unauthorized"));
}

function upstreamTextValues(data, responseText = "") {
  return [
    responseText,
    data?.error,
    data?.code,
    data?.message,
    data?.detail,
  ].map((value) => String(value || "").trim().toLowerCase());
}

function isFrameworkNotFound(status, data, responseText = "") {
  if (status !== 404) return false;
  const values = upstreamTextValues(data, responseText);
  return values.some((value) => (
    value === "not found" ||
    value === "404 not found" ||
    value === "page not found" ||
    value === "cannot post" ||
    value === "cannot get" ||
    value === "endpoint not found" ||
    value.includes("route not found")
  ));
}

function isMediaNotFound(status, data, responseText = "") {
  if (status !== 404) return false;
  const values = upstreamTextValues(data, responseText);
  return values.some((value) => (
    value.includes("media not found") ||
    value.includes("post not found") ||
    value.includes("video not found") ||
    value.includes("content not found") ||
    value.includes("no media") ||
    value.includes("does not exist") ||
    value.includes("no longer available")
  ));
}

function upstreamFailureText(data) {
  return upstreamTextValues(data, [
    data?.error,
    data?.error_code,
    data?.message,
    data?.detail,
    ...(Array.isArray(data?.warnings) ? data.warnings : []),
  ].filter(Boolean).join(" "));
}

const PROVIDER_ERROR_STATUS = {
  PROXY_AUTH_FAILED: 502,
  PROXY_QUOTA_EXHAUSTED: 502,
  PROXY_UNREACHABLE: 502,
  PLATFORM_BLOCKED_PROXY: 502,
  PROXY_BLOCKED: 502,
  COOKIE_REQUIRED: 401,
  COOKIE_EXPIRED: 401,
  LOGIN_REQUIRED: 401,
  ANTI_BOT_CHALLENGE: 403,
  RATE_LIMITED: 429,
  MEDIA_NOT_FOUND: 404,
  PRIVATE_MEDIA: 403,
  EXTRACTOR_OUTDATED: 502,
  EXTRACTOR_FAILED: 502,
};

function mapProviderErrorCode(data) {
  const rawCode = String(data?.error_code || data?.code || data?.error || "").trim().toUpperCase();
  const status = PROVIDER_ERROR_STATUS[rawCode];
  if (!status) return null;
  return publicError(rawCode, status, `upstream resolver reported ${rawCode}`);
}

function mapSuccessfulUpstreamFailure(data) {
  const structuredError = mapProviderErrorCode(data);
  if (structuredError) return structuredError;

  const values = upstreamFailureText(data);
  const text = values.join(" ");

  if (values.some((value) => value === "auth_failed" || value.includes("unauthorized"))) {
    return publicError("UPSTREAM_AUTH_FAILED", 502, "upstream resolver reported auth failure");
  }

  if (
    text.includes("proxy") ||
    text.includes("tunnel connection failed") ||
    text.includes("407") ||
    text.includes("quota") ||
    text.includes("bandwidth")
  ) {
    return publicError("UPSTREAM_PROXY_FAILED", 502, "upstream resolver reported proxy failure");
  }

  if (
    text.includes("private") ||
    text.includes("login") ||
    text.includes("cookies") ||
    text.includes("forbidden") ||
    text.includes("restricted")
  ) {
    return publicError("PRIVATE_MEDIA", 403, "upstream resolver reported private or restricted media");
  }

  if (
    text.includes("not found") ||
    text.includes("no media") ||
    text.includes("does not exist") ||
    text.includes("no longer available") ||
    text.includes("resolve failed") ||
    text.includes("no media resolver returned a result")
  ) {
    return publicError("MEDIA_NOT_FOUND", 404, "upstream resolver reported media not found");
  }

  return publicError("UNSUPPORTED_MEDIA", 422, "upstream resolver returned success=false");
}

function mapUpstreamError(status, data, responseText = "") {
  const structuredError = mapProviderErrorCode(data);
  if (structuredError) return structuredError;
  if (isAuthFailure(status, data)) return publicError("UPSTREAM_AUTH_FAILED", 502, "upstream rejected server API key");
  if (status === 403) return publicError("PRIVATE_MEDIA", 403, "upstream returned forbidden");
  if (isFrameworkNotFound(status, data, responseText)) {
    return publicError("UPSTREAM_ROUTE_NOT_FOUND", 502, "upstream route returned framework not found");
  }
  if (status === 404 || isMediaNotFound(status, data, responseText)) {
    return publicError("MEDIA_NOT_FOUND", 404, "upstream returned media not found");
  }
  if (status === 429) return publicError("UPSTREAM_RATE_LIMITED", 429, "upstream rate limited");
  if (status >= 500) return publicError("UPSTREAM_UNAVAILABLE", 503, `upstream returned ${status}`);
  return publicError("UPSTREAM_UNAVAILABLE", 502, `upstream returned ${status}`);
}

function isTransientStatus(status) {
  return status === 502 || status === 503 || status === 504 || status >= 500;
}

function retryDelay(attempt) {
  const jitter = Math.floor(Math.random() * 20);
  return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + jitter;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function downloadMedia({ env, platform, payload, requestId }) {
  const upstreamName = upstreamPlatform(platform);
  const target = `${env.upstreamBaseUrl}/${encodeURIComponent(upstreamName)}/download`;
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= MAX_TRANSIENT_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.info("[DownloadDash SMD] upstream request starting", {
        requestId,
        platform,
        upstreamPlatform: upstreamName,
        upstreamHost: env.upstreamHost,
        attempt,
      });

      const upstream = await fetch(target, {
        method: "POST",
        headers: buildHeaders(env.apiKey),
        body: JSON.stringify({
          ...payload,
          platform: upstreamName,
        }),
        signal: controller.signal,
      });

      const responseText = await upstream.text();
      const latencyMs = Date.now() - startedAt;

      console.info("[DownloadDash SMD] upstream response", {
        requestId,
        platform,
        upstreamPlatform: upstreamName,
        status: upstream.status,
        latencyMs,
        attempt,
      });

      if (!upstream.ok && isTransientStatus(upstream.status) && attempt <= MAX_TRANSIENT_RETRIES) {
        await wait(retryDelay(attempt));
        continue;
      }

      let data = null;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          if (upstream.ok) {
            throw publicError("UPSTREAM_INVALID_RESPONSE", 502, "upstream returned malformed JSON");
          }
        }
      }

      if (!upstream.ok) {
        throw mapUpstreamError(upstream.status, data, responseText);
      }

      if (data?.success === false) {
        const error = mapSuccessfulUpstreamFailure(data);
        console.warn("[DownloadDash SMD] upstream resolver failed", {
          requestId,
          platform,
          upstreamPlatform: upstreamName,
          status: upstream.status,
          code: error.code,
        });
        throw error;
      }

      return normalizeDownloadResponse(platform, data);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw publicError("UPSTREAM_TIMEOUT", 504, "upstream request timed out");
      }

      if (!error?.code && attempt <= MAX_TRANSIENT_RETRIES) {
        console.warn("[DownloadDash SMD] upstream network retry", {
          requestId,
          platform,
          upstreamPlatform: upstreamName,
          attempt,
          message: error?.message,
        });
        await wait(retryDelay(attempt));
        continue;
      }

      if (!error?.code) {
        throw publicError("UPSTREAM_UNAVAILABLE", 503, error?.message || "upstream network request failed");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw publicError("UPSTREAM_UNAVAILABLE", 503, "upstream retry attempts exhausted");
}

export async function proxyFileRequest({ env, forwardPath, payload, method, query, requestId, res }) {
  const target = new URL(`${env.upstreamBaseUrl}/${forwardPath.map(encodeURIComponent).join("/")}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (key === "path" || key === "...path") return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (entry !== undefined && entry !== null) target.searchParams.append(key, String(entry));
    });
  });

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers: buildHeaders(env.apiKey),
      body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    console.info("[DownloadDash SMD] file proxy response", {
      requestId,
      path: `/${forwardPath.join("/")}`,
      status: upstream.status,
      latencyMs: Date.now() - startedAt,
    });

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const disposition = upstream.headers.get("content-disposition");
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", disposition || `attachment; filename="${sanitizeFilename(payload?.filename)}"`);
    return res.end(buffer);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw publicError("UPSTREAM_TIMEOUT", 504, "file proxy request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyDiagnosticsRequest({ env, payload, requestId, res }) {
  const target = new URL(`${env.upstreamBaseUrl}/diagnostics/provider`);
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
  });

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: buildHeaders(env.apiKey),
      signal: controller.signal,
    });

    const responseText = await upstream.text();
    console.info("[DownloadDash SMD] diagnostics response", {
      requestId,
      status: upstream.status,
      latencyMs: Date.now() - startedAt,
    });

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.end(responseText);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw publicError("UPSTREAM_TIMEOUT", 504, "diagnostics request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
