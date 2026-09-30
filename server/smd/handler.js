import { randomUUID } from "node:crypto";
import { downloadMedia, proxyDiagnosticsRequest, proxyFileRequest } from "./client.js";
import { getServerEnv, getServerEnvDiagnostics } from "./env.js";
import { json, publicError, sendError } from "./errors.js";
import { enforceRateLimit } from "./rate-limit.js";
import {
  FREE_BATCH_URL_LIMIT,
  PRO_BATCH_URL_LIMIT,
  parseRoute,
  validateBatchDownloadRequest,
  validateDiagnosticsRequest,
  validateDownloadRequest,
  validateFileProxyRequest,
} from "./validation.js";
import { getAccountService } from "../pro/account-service.js";

const UPSTREAM_HEALTH_TIMEOUT_MS = 4_000;
const DEFAULT_BATCH_CONCURRENCY = 3;
const MAX_BATCH_CONCURRENCY = 3;

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

function logStage(stage, details) {
  console.info(`[DownloadDash SMD] ${stage}`, details);
}

function wantsUpstreamHealth(req) {
  const value = req.query?.upstream ?? req.query?.checkUpstream;
  return value === "1" || value === "true" || value === true;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }));

  return results;
}

function configuredBatchConcurrency(itemCount) {
  const requested = Number.parseInt(process.env.SMD_BATCH_CONCURRENCY || "", 10) || DEFAULT_BATCH_CONCURRENCY;
  return Math.min(Math.max(1, requested), MAX_BATCH_CONCURRENCY, Math.max(1, itemCount));
}

async function batchEntitlement(req) {
  const account = await getAccountService().getAccountFromCookie(req.headers.cookie || "");
  const isPro = account?.plan === "pro" && account?.entitlements?.adFree === true;
  return {
    account,
    isPro,
    maxBatchUrls: isPro ? PRO_BATCH_URL_LIMIT : FREE_BATCH_URL_LIMIT,
  };
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
  const startedAt = Date.now();
  let validationMs = 0;
  const context = {
    platform: null,
    kind: null,
    path: null,
  };
  applyCors(res);
  res.setHeader("X-Request-ID", requestId);

  logStage("request received", {
    requestId,
    method: req.method,
    url: req.url || req.originalUrl,
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    enforceRateLimit(req);

    const routingStartedAt = Date.now();
    const parts = getPathParts(req);
    const route = parseRoute(parts);
    const routingMs = Date.now() - routingStartedAt;
    const diagnostics = getServerEnvDiagnostics();
    context.platform = route.platform || null;
    context.kind = route.kind;
    context.path = `/${parts.join("/")}`;

    logStage("route resolved", {
      requestId,
      method: req.method,
      path: context.path,
      kind: route.kind,
      platform: route.platform,
    });

    logStage("configuration checked", {
      requestId,
      platform: route.platform,
      hasDownloadDashApiKey: diagnostics.hasDownloadDashApiKey,
      apiKeyLength: diagnostics.apiKeyLength,
      hasUpstreamBaseUrl: diagnostics.hasUpstreamBaseUrl,
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

    if (route.kind === "file") {
      const validationStartedAt = Date.now();
      const payload = validateFileProxyRequest(req);
      validationMs = Date.now() - validationStartedAt;
      logStage("validation passed", {
        requestId,
        kind: route.kind,
        path: `/${route.forwardPath.join("/")}`,
        validationMs,
      });
      const env = getServerEnv();
      logStage("environment loaded", {
        requestId,
        platform: route.platform,
        upstreamHost: env.upstreamHost,
      });
      return await proxyFileRequest({
        env,
        forwardPath: route.forwardPath,
        payload,
        method: req.method,
        query: req.query,
        requestId,
        res,
      });
    }

    if (route.kind === "diagnostics") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        throw publicError("UNSUPPORTED_PLATFORM", 405, `method ${req.method} is not supported for diagnostics`);
      }
      const validationStartedAt = Date.now();
      const payload = validateDiagnosticsRequest(req);
      validationMs = Date.now() - validationStartedAt;
      logStage("validation passed", {
        requestId,
        kind: route.kind,
        path: `/${route.forwardPath.join("/")}`,
        validationMs,
      });
      const env = getServerEnv();
      logStage("environment loaded", {
        requestId,
        platform: payload.platform,
        upstreamHost: env.upstreamHost,
      });
      return proxyDiagnosticsRequest({ env, payload, requestId, res });
    }

    if (route.kind === "batch") {
      if (req.method !== "POST") {
        throw publicError("UNSUPPORTED_PLATFORM", 405, `method ${req.method} is not supported for batch downloads`);
      }

      const entitlement = await batchEntitlement(req);
      let payload;
      try {
        const validationStartedAt = Date.now();
        payload = validateBatchDownloadRequest(req, { maxUrls: entitlement.maxBatchUrls });
        validationMs = Date.now() - validationStartedAt;
      } catch (error) {
        if (error?.code === "PRO_UPGRADE_REQUIRED" || error?.code === "BATCH_LIMIT_EXCEEDED") {
          return json(res, error.status || 400, {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
            maxBatchUrls: entitlement.maxBatchUrls,
            requestId,
          });
        }
        throw error;
      }
      const env = getServerEnv();
      const concurrency = configuredBatchConcurrency(payload.items.length);

      logStage("validation passed", {
        requestId,
        kind: route.kind,
        count: payload.items.length,
        maxBatchUrls: entitlement.maxBatchUrls,
        pro: entitlement.isPro,
        validationMs,
      });

      const resolvedResults = await mapWithConcurrency(payload.items, concurrency, async (item) => {
        try {
          const data = await downloadMedia({
            env,
            platform: item.platform,
            payload: {
              url: item.url,
              quality: item.quality,
              extract_audio: item.extract_audio,
              include_metadata: item.include_metadata,
            },
            requestId: `${requestId}:${item.index}`,
          });
          return {
            index: item.index,
            url: item.url,
            platform: item.platform,
            status: "complete",
            data: data.data,
          };
        } catch (error) {
          return {
            index: item.index,
            url: item.url,
            platform: item.platform,
            status: "failed",
            error: {
              code: error?.code || "INTERNAL_ERROR",
              message: error?.message || "Resolve failed",
            },
          };
        }
      });

      const results = resolvedResults
        .concat(payload.invalidItems || [])
        .sort((a, b) => a.index - b.index);
      const failedCount = results.filter((entry) => entry.status === "failed").length;
      return json(res, failedCount ? 207 : 200, {
        success: failedCount === 0,
        maxBatchUrls: entitlement.maxBatchUrls,
        concurrency,
        totalUrls: results.length,
        duplicateUrlsRemoved: payload.duplicateUrlsRemoved || 0,
        results,
        requestId,
      });
    }

    if (req.method !== "POST") {
      throw publicError("UNSUPPORTED_PLATFORM", 405, `method ${req.method} is not supported`);
    }

    const validationStartedAt = Date.now();
    const payload = await validateDownloadRequest(route.platform, req);
    validationMs = Date.now() - validationStartedAt;
    logStage("validation passed", {
      requestId,
      kind: route.kind,
      platform: route.platform,
      validationMs,
    });
    const env = getServerEnv();
    logStage("environment loaded", {
      requestId,
      platform: route.platform,
      upstreamHost: env.upstreamHost,
    });
    const result = await downloadMedia({ env, platform: route.platform, payload, requestId });
    const responseMs = Date.now() - startedAt;
    const timing = {
      ...(result.timing || {}),
      requestId,
      platform: route.platform,
      validationMs,
      routingMs,
      vercelMs: result.timing?.proxyMs ?? 0,
      renderQueueMs: result.timing?.renderQueueMs ?? result.timing?.queueWaitMs ?? 0,
      proxyMs: result.timing?.proxyMs ?? 0,
      responseMs,
      totalMs: responseMs,
    };
    logStage("response normalized", {
      requestId,
      platform: route.platform,
      ...timing,
    });
    return json(res, 200, { ...result, timing, requestId });
  } catch (error) {
    const normalizedError = context.kind === "file" && !error?.code
      ? publicError("MEDIA_DELIVERY_FAILED", 502, error?.message || "file delivery failed")
      : error;
    const code = normalizedError?.code || "INTERNAL_ERROR";
    console.error("[DownloadDash SMD] request failed", {
      requestId,
      platform: context.platform,
      kind: context.kind,
      path: context.path,
      code,
      status: normalizedError?.status || 500,
      latencyMs: Date.now() - startedAt,
      message: normalizedError?.logMessage || normalizedError?.message,
    });
    return sendError(res, normalizedError, requestId);
  }
}
