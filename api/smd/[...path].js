// api/smd/[...path].js
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
  "upgrade"
]);

const PLATFORM_MAP = {
  "youtube": "youtube",
  "instagram": "instagram",
  "tiktok": "tiktok",
  "facebook": "facebook",
  "pinterest": "pinterest",
  "reddit": "reddit",
  "x": "x",
  "twitter": "x",
  "telegram": "telegram"
};

function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function normalizeUpstreamBaseUrl(value) {
  let normalized = String(value || DEFAULT_UPSTREAM_BASE_URL)
    .trim()
    .replace(/\/+$/, "");

  normalized = normalized.replace(/\/api\/smd$/i, "");
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

  if (!requestUrl) {
    return [];
  }

  const parsed = new URL(requestUrl, "https://downloaddash.local");

  const match = parsed.pathname.match(/^\/api\/smd\/?(.*)$/);

  if (!match || !match[1]) {
    return [];
  }

  return asPathParts(match[1]);
}

function appendQueryParams(target, query = {}) {
  Object.entries(query).forEach(([key, value]) => {
    if (key === "path" || key === "...path") {
      return;
    }

    const values = Array.isArray(value) ? value : [value];

    values.forEach((entry) => {
      if (entry !== undefined && entry !== null) {
        target.searchParams.append(key, String(entry));
      }
    });
  });
}

function getRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  if (req.body === undefined || req.body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body;
  }

  return JSON.stringify(req.body);
}

// --- FIX: Build headers with DOWNLOADDASH_API_KEY ---
function buildForwardHeaders(req, apiKey) {
  const headers = {
    "Accept": req.headers.accept || "application/json",
    "DOWNLOADDASH_API_KEY": apiKey,
    "Authorization": "Bearer " + apiKey
  };

  const contentType = req.headers["content-type"];

  if (contentType) {
    headers["Content-Type"] = contentType;
  } else if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  if (req.headers["x-rapidapi-proxy-secret"]) {
    headers["X-RapidAPI-Proxy-Secret"] = req.headers["x-rapidapi-proxy-secret"];
  }

  return headers;
}

// --- FIX: Get API key from multiple sources ---
function getApiKey() {
  const key = process.env.DOWNLOADDASH_API_KEY || 
              process.env.VITE_DOWNLOADDASH_API_KEY || 
              process.env.NEXT_PUBLIC_DOWNLOADDASH_API_KEY || 
              process.env.API_KEY || 
              "";
  
  return String(key).trim();
}

// --- FIX: Validate API key format ---
function isValidApiKey(key) {
  if (!key || key.length < 10) return false;
  if (key.startsWith("sk_") || key.startsWith("test_")) return true;
  return key.length >= 20;
}

export default async function handler(req, res) {
  console.info("[DownloadDash SMD Proxy] START");
  console.info("Method:", req.method);
  console.info("URL:", req.url);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept,Authorization,DOWNLOADDASH_API_KEY,X-RapidAPI-Proxy-Secret"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- FIX: Get and validate API key ---
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("❌ DOWNLOADDASH_API_KEY is missing!");
    
    return json(res, 500, {
      success: false,
      message: "DOWNLOADDASH_API_KEY is not configured.",
      error: "API_KEY_MISSING",
      tip: "Add DOWNLOADDASH_API_KEY to your Vercel environment variables"
    });
  }

  if (!isValidApiKey(apiKey)) {
    console.warn("⚠️ API key looks invalid. Length:", apiKey.length);
    
    return json(res, 403, {
      success: false,
      message: "Invalid API key format.",
      error: "INVALID_API_KEY_FORMAT",
      tip: "API key should start with 'sk_' or 'test_' and be at least 20 characters long"
    });
  }

  console.log("✅ API Key found. Length:", apiKey.length);

  const baseUrl = normalizeUpstreamBaseUrl(
    process.env.SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL
  );

  // Extract path parts
  let parts = asPathParts(req.query?.path);

  if (!parts.length) {
    parts = asPathParts(req.query?.["...path"]);
  }

  if (!parts.length) {
    parts = pathPartsFromUrl(req);
  }

  if (!parts.length) {
    return json(res, 404, {
      success: false,
      message: "API proxy path is missing."
    });
  }

  // Handle platform download routes
  let forwardParts;
  let platform = parts[0]?.toLowerCase();
  
  if (parts.length === 1 && parts[0] === "test") {
    forwardParts = ["api", "v1", "test"];
  } else if (parts.length >= 2 && parts[1] === "download") {
    const mappedPlatform = PLATFORM_MAP[platform] || platform;
    forwardParts = ["api", "v1", mappedPlatform, "download"];
  } else if (parts.length === 1) {
    const mappedPlatform = PLATFORM_MAP[platform] || platform;
    forwardParts = ["api", "v1", mappedPlatform];
  } else {
    forwardParts = ["api", "v1"].concat(parts);
  }

  const target = new URL(baseUrl + "/" + forwardParts.join("/"));

  appendQueryParams(target, req.query);

  console.info("Forward URL:", target.toString());

  const controller = new AbortController();
  const timeout = setTimeout(function() {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    console.log("📤 Sending request to:", target.toString());

    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: buildForwardHeaders(req, apiKey),
      body: getRequestBody(req),
      signal: controller.signal
    });

    console.info("Upstream Status:", upstream.status);

    // --- FIX: Handle 403 with detailed error ---
    if (upstream.status === 403) {
      let errorText = "";
      try {
        const errorJson = await upstream.json();
        errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorText = await upstream.text();
      }
      
      console.error("❌ 403 Forbidden:", errorText);
      
      return json(res, 403, {
        success: false,
        message: "API authentication failed. Please check your DOWNLOADDASH_API_KEY.",
        error: "AUTH_FAILED",
        details: errorText,
        tip: "Make sure your DOWNLOADDASH_API_KEY is valid and not expired"
      });
    }

    // --- FIX: Handle 401 ---
    if (upstream.status === 401) {
      return json(res, 401, {
        success: false,
        message: "Unauthorized. Invalid DOWNLOADDASH_API_KEY.",
        error: "UNAUTHORIZED",
        tip: "Your DOWNLOADDASH_API_KEY is invalid"
      });
    }

    const responseText = await upstream.text();
    
    if (!responseText || responseText.trim() === "") {
      if (upstream.status === 404) {
        return json(res, 404, {
          success: false,
          message: "Endpoint not found.",
          platform: platform
        });
      }
      
      return json(res, upstream.status || 502, {
        success: false,
        message: "Empty response from upstream.",
        status: upstream.status
      });
    }

    let responseData;
    let isJson = false;
    
    try {
      responseData = JSON.parse(responseText);
      isJson = true;
    } catch (parseError) {
      console.warn("Response is not JSON");
    }

    upstream.headers.forEach(function(value, key) {
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

    if (isJson) {
      res.setHeader("Content-Type", "application/json");
      return json(res, upstream.status, responseData);
    } else {
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.status(upstream.status);
      return res.end(responseText);
    }

  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error("❌ Proxy error:", error);

    return json(res, 502, {
      success: false,
      message: timedOut
        ? "Request timed out. Please try again."
        : "Could not reach the backend API.",
      detail: error?.message || "Network connection failed."
    });
  } finally {
    clearTimeout(timeout);
  }
}