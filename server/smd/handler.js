import { randomUUID } from "node:crypto";
import { downloadMedia, proxyFileRequest } from "./client.js";
import { getServerEnv } from "./env.js";
import { json, publicError, sendError } from "./errors.js";
import { enforceRateLimit } from "./rate-limit.js";
import { parseRoute, validateDownloadRequest, validateFileProxyRequest } from "./validation.js";

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
    const env = getServerEnv();

    console.info("[DownloadDash SMD] request", {
      requestId,
      method: req.method,
      path: `/${parts.join("/")}`,
      kind: route.kind,
      platform: route.platform,
    });

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
