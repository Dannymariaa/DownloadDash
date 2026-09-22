import { publicError } from "./errors.js";
import { normalizeDownloadResponse } from "./normalize.js";
import { upstreamPlatform } from "./platforms.js";

const REQUEST_TIMEOUT_MS = 55_000;
const MAX_TRANSIENT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 40;

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

function mapUpstreamError(status, data) {
  if (isAuthFailure(status, data)) return publicError("UPSTREAM_AUTH_FAILED", 502, "upstream rejected server API key");
  if (status === 403) return publicError("PRIVATE_MEDIA", 403, "upstream returned forbidden");
  if (status === 404) return publicError("MEDIA_NOT_FOUND", 404, "upstream returned not found");
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
          throw publicError("UPSTREAM_INVALID_RESPONSE", 502, "upstream returned malformed JSON");
        }
      }

      if (!upstream.ok) {
        throw mapUpstreamError(upstream.status, data);
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

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
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
