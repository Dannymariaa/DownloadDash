import { randomUUID } from "node:crypto";
import { downloadMedia, proxyFileRequest } from "./client.js";
import { getServerEnv, getServerEnvDiagnostics } from "./env.js";
import { json, publicError, sendError } from "./errors.js";
import { enforceRateLimit } from "./rate-limit.js";
import { parseRoute, validateDownloadRequest, validateFileProxyRequest } from "./validation.js";

const UPSTREAM_HEALTH_TIMEOUT_MS = 2_500;

function asPathParts(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((part) => String(part).split("/"))
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)));
}

function pathPartsFromUrl(req) {
  const requestUrl = req.url || req.originalUrl;
  if (!requestUrl) return [];

  const parsed = new URL(requestUrl, "https://downloaddash.local");
  const match = parsed.pathname.match(/^\/api\/smd\/?(.*)$/);
  if (!match || !match[1]) return [];
  return asPathParts(match[1]);
}

function getPathParts(req) {
  let parts = asPathParts(req.query?.path);
  if (!parts.length) parts = asPathParts(req.query?.["...path"]);
  if (!parts.length) parts = pathPartsFromUrl(req);
  if (parts[0] === "api") parts = parts.slice(1);
  if (parts[0] === "smd") parts = parts.slice(1);
  return parts;
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept,X-Request-ID");
  res.setHeader("Access-Control-Expose-Headers", "X-Request-ID");
}

function wantsUpstreamHealth(req) {
  const value = req.query?.upstream ?? req.query?.checkUpstream;
  return value === "1" || value === "true" || value === true;
}

async function checkUpstreamHealth(upstreamBaseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_HEALTH_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const upstream = await fetch(`${upstreamBaseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    return {
      upstreamReachable: upstream.ok,
      upstreamStatus: upstream.status,
      upstreamLatencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      upstreamReachable: false,
      upstreamStatus: null,
      upstreamLatencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleSmdRequest(req, res) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  applyCors(res);
  res.setHeader("X-Request-ID", requestId);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    enforceRateLimit(req);

    const parts = getPathParts(req);
    const route = parseRoute(parts);
    const diagnostics = getServerEnvDiagnostics();

    console.info("[DownloadDash SMD] request", {
      requestId,
      method: req.method,
      path: `/${parts.join("/")}`,
      kind: route.kind,
      platform: route.platform,
      hasDownloadDashApiKey: diagnostics.hasDownloadDashApiKey,
      apiKeyLength: diagnostics.apiKeyLength,
      hasUpstreamBaseUrl: diagnostics.hasUpstreamBaseUrl,
      upstreamHost: diagnostics.upstreamHost,
    });

    if (route.kind === "health") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        throw publicError("UNSUPPORTED_PLATFORM", 405, `method ${req.method} is not supported for health`);
      }

      const upstreamHealth = wantsUpstreamHealth(req)
        ? await checkUpstreamHealth(diagnostics.upstreamBaseUrl)
        : {};

      return json(res, diagnostics.proxyConfigured ? 200 : 503, {
        success: diagnostics.proxyConfigured,
        service: "smd-proxy",
        configured: diagnostics.proxyConfigured,
        proxyConfigured: diagnostics.proxyConfigured,
        upstreamHost: diagnostics.upstreamHost || null,
        ...upstreamHealth,
        requestId,
      });
    }

    const env = getServerEnv();

    if (route.kind === "file") {
      const payload = validateFileProxyRequest(req);
      return proxyFileRequest({
        env,
        forwardPath: route.forwardPath,
        payload,
        method: req.method,
        query: req.query,
        requestId,
        res,
      });
    }

    if (req.method !== "POST") {
      throw publicError("UNSUPPORTED_PLATFORM", 405, `method ${req.method} is not supported`);
    }

    const payload = validateDownloadRequest(route.platform, req);
    const result = await downloadMedia({ env, platform: route.platform, payload, requestId });
    return json(res, 200, { ...result, requestId });
  } catch (error) {
    const code = error?.code || "INTERNAL_ERROR";
    console.error("[DownloadDash SMD] request failed", {
      requestId,
      code,
      status: error?.status || 500,
      message: error?.logMessage || error?.message,
    });
    return sendError(res, error, requestId);
  }
}
