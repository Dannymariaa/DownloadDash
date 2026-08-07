console.log("DOWNLOADDASH PROXY LOADED");
console.log("[DownloadDash Proxy] module loaded", {
  node: process.version,
  timestamp: new Date().toISOString(),
});

const DEFAULT_UPSTREAM_BASE_URL = "https://api.downloaddash.store";
const REQUEST_TIMEOUT_MS = 55000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const PLATFORM_MAP = {
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  pinterest: "pinterest",
  reddit: "reddit",
  x: "twitter",
  twitter: "twitter",
  telegram: "telegram",
  whatsappbusiness: "whatsapp_business",
  whatsapp_business: "whatsapp_business",
};

function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function normalizeUpstreamBaseUrl(value) {
  let normalized = String(value || DEFAULT_UPSTREAM_BASE_URL)
    .trim()
    .replace(/\/+$/, "");

  normalized = normalized.replace(/\/api\/smd$/i, "");
  normalized = normalized.replace(/\/api\/v1$/i, "");
  normalized = normalized.replace(/\/api$/i, "");
  normalized = normalized.replace(/\/smd$/i, "");

  return normalized || DEFAULT_UPSTREAM_BASE_URL;
}

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

  if (!parts.length) {
    parts = asPathParts(req.query?.["...path"]);
  }

  if (!parts.length) {
    parts = pathPartsFromUrl(req);
  }

  if (parts[0] === "api") parts = parts.slice(1);
  if (parts[0] === "smd") parts = parts.slice(1);

  return parts;
}

function appendQueryParams(target, query = {}) {
  Object.entries(query).forEach(([key, value]) => {
    if (key === "path" || key === "...path") return;

    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (entry !== undefined && entry !== null) {
        target.searchParams.append(key, String(entry));
      }
    });
  });
}

function getRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body);
}

function getApiKey() {
  return String(process.env.DOWNLOADDASH_API_KEY || "").trim();
}

function buildForwardHeaders(req, apiKey) {
  // Do not forward browser Authorization headers to Render. The proxy is the
  // trusted server boundary and always authenticates upstream with Vercel's key.
  const headers = {
    Accept: req.headers.accept || "application/json",
    "X-DownloadDash-Key": apiKey,
    "X-API-Key": apiKey,
    DOWNLOADDASH_API_KEY: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };

  const contentType = req.headers["content-type"];
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  if (req.headers["x-rapidapi-proxy-secret"]) {
    headers["X-RapidAPI-Proxy-Secret"] = req.headers["x-rapidapi-proxy-secret"];
  }

  return headers;
}

function buildForwardPath(parts) {
  if (!parts.length) return [];

  const first = decodeURIComponent(parts[0]).toLowerCase();
  const second = parts[1] ? decodeURIComponent(parts[1]).toLowerCase() : "";

  if (parts.length >= 2 && second === "download") {
    return [PLATFORM_MAP[first] || first, "download"];
  }

  if (first === "download" && parts[1] === "file") {
    return ["download", "file"];
  }

  if (first === "youtube" && parts[1] === "file") {
    return ["youtube", "file"];
  }

  if (first === "health" || first === "docs" || first === "stats") {
    return [first, ...parts.slice(1)];
  }

  if (PLATFORM_MAP[first]) {
    return [PLATFORM_MAP[first], ...parts.slice(1)];
  }

  return parts.map((part) => decodeURIComponent(part));
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(lower) ||
      lower === "content-length" ||
      lower === "content-encoding" ||
      lower === "access-control-allow-origin"
    ) {
      return;
    }

    res.setHeader(key, value);
  });
}

export default async function handler(req, res) {
  const parts = getPathParts(req);

  console.info("[DownloadDash Proxy] incoming request", {
    method: req.method,
    url: req.url,
    parsedPath: `/${parts.join("/")}`,
    query: req.query,
    contentType: req.headers["content-type"],
  });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept,Authorization,X-API-Key,X-DownloadDash-Key,DOWNLOADDASH_API_KEY,X-RapidAPI-Proxy-Secret",
  );
  res.setHeader("Access-Control-Expose-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("[DownloadDash Proxy] DOWNLOADDASH_API_KEY is missing");
    return json(res, 500, {
      success: false,
      message: "DOWNLOADDASH_API_KEY is not configured.",
      error: "API_KEY_MISSING",
    });
  }

  if (!parts.length) {
    return json(res, 404, {
      success: false,
      message: "API proxy path is missing.",
      error: "PROXY_PATH_MISSING",
    });
  }

  const forwardPath = buildForwardPath(parts);
  console.info("[DownloadDash Proxy] resolved route", {
    parsedPath: `/${parts.join("/")}`,
    forwardedPath: `/${forwardPath.join("/")}`,
  });

  const baseUrl = normalizeUpstreamBaseUrl(process.env.SMD_API_BASE_URL);
  const target = new URL(`${baseUrl}/${forwardPath.map(encodeURIComponent).join("/")}`);

  appendQueryParams(target, req.query);
  console.info("[DownloadDash Proxy] upstream url", {
    upstreamUrl: target.toString(),
  });

  console.info("[DownloadDash Proxy] Forwarding request", {
    method: req.method,
    path: `/${parts.join("/")}`,
    upstreamPath: `/${forwardPath.join("/")}`,
    hasApiKey: true,
    apiKeyLength: apiKey.length,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: buildForwardHeaders(req, apiKey),
      body: getRequestBody(req),
      signal: controller.signal,
    });

    const responseBuffer = Buffer.from(await upstream.arrayBuffer());
    const responseText = responseBuffer.toString("utf8");
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    console.info("[DownloadDash Proxy] Upstream response", {
      forwardedPath: `/${forwardPath.join("/")}`,
      upstreamUrl: target.toString(),
      status: upstream.status,
      contentType,
    });

    copyResponseHeaders(upstream, res);

    if (!upstream.ok) {
      let details = responseText;
      try {
        const parsed = JSON.parse(responseText);
        details = parsed.detail || parsed.error || parsed.message || parsed;
      } catch {
        details = responseText.slice(0, 1000);
      }

      return json(res, upstream.status, {
        success: false,
        message:
          upstream.status === 401 || upstream.status === 403
            ? "API authentication failed. Check the server-side DOWNLOADDASH_API_KEY in Vercel."
            : "Backend API request failed.",
        error: upstream.status === 401 || upstream.status === 403 ? "AUTH_FAILED" : "UPSTREAM_FAILED",
        endpoint: `/${forwardPath.join("/")}`,
        status: upstream.status,
        details,
      });
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    return res.end(responseBuffer);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("DOWNLOADDASH PROXY ERROR");
    console.error(error?.stack || error);
    console.error("[DownloadDash Proxy] Request failed", {
      path: `/${parts.join("/")}`,
      forwardedPath: `/${forwardPath.join("/")}`,
      upstreamUrl: target.toString(),
      message: error?.message,
      timedOut,
      stack: error?.stack,
    });

    return json(res, 502, {
      success: false,
      message: timedOut ? "Request timed out. Please try again." : "Could not reach the backend API.",
      error: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE",
      detail: error?.message || "Network connection failed.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
