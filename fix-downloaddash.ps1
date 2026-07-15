# fix-downloaddash.ps1
# Run this script from your project root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DownloadDash Fix Script" -ForegroundColor Cyan
Write-Host "  Creating all missing files..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create directories
$directories = @(
    "api/smd",
    "utils",
    "components",
    "hooks",
    "types",
    "config",
    "services",
    "pages",
    "styles"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# ============================================
# 1. CREATE api/smd/[...path].js
# ============================================
Write-Host "`nCreating api/smd/[...path].js..." -ForegroundColor Yellow

$content = '// api/smd/[...path].js
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

function buildForwardHeaders(req, apiKey) {
  const headers = {
    "Accept": req.headers.accept || "application/json",
    "X-DownloadDash-Key": apiKey,
    "X-API-Key": apiKey,
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

export default async function handler(req, res) {
  console.info("[DownloadDash SMD Proxy] START");
  console.info("Method:", req.method);
  console.info("URL:", req.url);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept,Authorization,X-DownloadDash-Key,X-API-Key,X-RapidAPI-Proxy-Secret"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || "").trim();

  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message: "DOWNLOADDASH_API_KEY is not configured on the Vercel serverless function."
    });
  }

  const baseUrl = normalizeUpstreamBaseUrl(
    process.env.SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL
  );

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
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: buildForwardHeaders(req, apiKey),
      body: getRequestBody(req),
      signal: controller.signal
    });

    console.info("Upstream Status:", upstream.status);

    const responseText = await upstream.text();
    
    if (!responseText || responseText.trim() === "") {
      if (upstream.status === 404) {
        return json(res, 404, {
          success: false,
          message: "The requested endpoint was not found on the upstream API."
        });
      }
      
      return json(res, upstream.status || 502, {
        success: false,
        message: "The upstream API returned an empty response. Please try again.",
        status: upstream.status
      });
    }

    let responseData;
    let isJson = false;
    
    try {
      responseData = JSON.parse(responseText);
      isJson = true;
    } catch (parseError) {
      console.warn("Response is not JSON, treating as raw data");
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

    console.error("Proxy error:", error);

    return json(res, 502, {
      success: false,
      message: timedOut
        ? "The downloading engine took too long to return data. Please try again."
        : "The DownloadDash API proxy could not reach the backend.",
      detail: error?.message || "Network connection failed.",
      path: parts.join("/"),
      target: target.toString()
    });
  } finally {
    clearTimeout(timeout);
  }
}'

[System.IO.File]::WriteAllText("api/smd/[...path].js", $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Created: api/smd/[...path].js" -ForegroundColor Green

# ============================================
# 2. CREATE utils/downloadDash.js
# ============================================
Write-Host "`nCreating utils/downloadDash.js..." -ForegroundColor Yellow

$content = '// utils/downloadDash.js

const DEFAULT_API_BASE_URL = "/api/smd";
const REQUEST_TIMEOUT_MS = 30000;

const PLATFORM_MAP = {
  "youtube": "youtube",
  "instagram": "instagram",
  "tiktok": "tiktok",
  "facebook": "facebook",
  "pinterest": "pinterest",
  "reddit": "reddit",
  "x": "x",
  "twitter": "x",
  "telegram": "telegram",
  "whatsappbusiness": "whatsapp_business",
  "whatsapp_business": "whatsapp_business"
};

const getApiBaseUrl = function() {
  const raw = import.meta?.env?.VITE_SMD_API_BASE_URL || DEFAULT_API_BASE_URL;
  const normalized = String(raw).replace(/\/+$/, "") || DEFAULT_API_BASE_URL;
  return normalized;
};

const buildHeaders = function() {
  return { "Content-Type": "application/json" };
};

const absolutizeApiUrl = function(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!url.startsWith("/")) return getApiBaseUrl() + "/" + url;
  return getApiBaseUrl() + url;
};

const postJson = async function(path, body) {
  const baseUrl = getApiBaseUrl();
  let res;
  
  try {
    res = await fetch(baseUrl + path, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the DownloadDash API proxy at " + baseUrl + ". " +
      "Check that the Vercel deployment is live and that server-side DOWNLOADDASH_API_KEY is configured."
    );
  }

  let responseText;
  try {
    responseText = await res.text();
  } catch {
    throw new Error("Failed to read response from server");
  }

  if (!responseText || responseText.trim() === "") {
    if (res.status === 404) {
      throw new Error("API endpoint not found. Please check your API configuration.");
    }
    throw new Error("Server returned an empty response (" + res.status + ")");
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError);
    console.log("Raw response:", responseText.substring(0, 500));
    throw new Error("Invalid response format from server");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        data?.message === "Unauthorized"
          ? "DownloadDash API authentication failed. Check the server-side DOWNLOADDASH_API_KEY in Vercel."
          : data?.message || "DownloadDash API request was forbidden."
      );
    }
    if (res.status === 404) {
      throw new Error(
        data?.message || "API endpoint not found (" + res.status + "). Please check your API configuration."
      );
    }
    if (res.status === 429) {
      throw new Error(
        data?.message || "Rate limit exceeded. Please try again later."
      );
    }
    const message = data?.detail || data?.error || data?.message || "Request failed (" + res.status + ")";
    throw new Error(message);
  }
  
  return data;
};

const detectPlatform = function(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("tiktok.com")) return "tiktok";
    if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) return "facebook";
    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) return "pinterest";
    if (hostname.includes("reddit.com") || hostname.includes("redd.it")) return "reddit";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "x";
    if (hostname.includes("t.me") || hostname.includes("telegram.me") || hostname.includes("telegram.org")) return "telegram";
    
    return null;
  } catch {
    return null;
  }
};

const resolveViaApi = async function({ url, platform, quality, extractAudio }) {
  const detectedPlatform = platform || detectPlatform(url);
  if (!detectedPlatform) {
    throw new Error("Could not detect platform. Please specify a platform.");
  }

  const mappedPlatform = PLATFORM_MAP[detectedPlatform] || detectedPlatform;
  const apiPath = "/api/smd/" + mappedPlatform + "/download";
  
  if (!mappedPlatform || mappedPlatform === "undefined") {
    throw new Error("Unsupported platform: " + detectedPlatform);
  }

  const payload = {
    url: url,
    quality: quality || "highest",
    extract_audio: !!extractAudio,
    include_metadata: true
  };

  console.log("[DownloadDash] Resolving: " + mappedPlatform + " | " + apiPath);

  let data;
  try {
    data = await postJson(apiPath, payload);
  } catch (error) {
    if (error.message.includes("404")) {
      throw new Error("Platform \"" + detectedPlatform + "\" endpoint not found. Please check your API configuration.");
    }
    if (error.message.includes("empty response")) {
      throw new Error("Server returned an empty response. Please try again.");
    }
    throw error;
  }

  if (data?.success === false) {
    const message = data?.error || data?.message || "Resolve failed";
    throw new Error(message);
  }

  const downloads = data?.downloads || {};
  const mediaInfo = data?.media_info || {};
  
  const videoHD = downloads.videoHD || downloads.video || null;
  const videoSD = downloads.videoSD || downloads.video || null;
  const audio = downloads.audio || downloads.audio_url || null;
  const image = downloads.image || downloads.image_url || null;
  
  const title = mediaInfo.title || data?.title || "DownloadDash Media";
  const thumbnail = mediaInfo.thumbnail_url || mediaInfo.preview_url || data?.thumbnail_url || null;
  
  const primaryUrl = extractAudio ? (audio || videoHD || videoSD) : (videoHD || videoSD || audio || image || data?.download_url);

  if (!primaryUrl) {
    console.error("No download URL found in response:", data);
    throw new Error("No downloadable URL found for this content.");
  }

  return {
    success: true,
    platform: mappedPlatform,
    title: title,
    thumbnail: absolutizeApiUrl(thumbnail),
    type: mediaInfo.media_type || "video",
    downloads: {
      videoHD: absolutizeApiUrl(videoHD),
      videoSD: absolutizeApiUrl(videoSD),
      audio: absolutizeApiUrl(audio),
      image: absolutizeApiUrl(image || thumbnail)
    },
    primaryUrl: absolutizeApiUrl(primaryUrl),
    originalUrl: url,
    raw: data
  };
};

const downloadDash = {
  download: async function(platform, params) {
    const { url, quality, extractAudio } = params || {};
    if (!url) throw new Error("URL is required");
    return resolveViaApi({ url: url, platform: platform, quality: quality, extractAudio: extractAudio });
  },
  detectPlatform: detectPlatform,
  resolveViaApi: resolveViaApi
};

export default downloadDash;'

[System.IO.File]::WriteAllText("utils/downloadDash.js", $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Created: utils/downloadDash.js" -ForegroundColor Green

# ============================================
# 3. CREATE .env.local
# ============================================
Write-Host "`nCreating .env.local..." -ForegroundColor Yellow
Set-Content -Path ".env.local" -Value "# .env.local`nDOWNLOADDASH_API_KEY=your_api_key_here`nVITE_SMD_API_BASE_URL=/api/smd`nNEXT_PUBLIC_API_URL=https://www.downloaddash.store"
Write-Host "Created: .env.local" -ForegroundColor Green

# ============================================
# 4. CREATE vercel.json
# ============================================
Write-Host "`nCreating vercel.json..." -ForegroundColor Yellow
Set-Content -Path "vercel.json" -Value "{`n  `"rewrites`": [`n    { `"source`": `"/api/smd/(.*)`", `"destination`": `"/api/smd/[...path]`" }`n  ],`n  `"env`": {`n    `"DOWNLOADDASH_API_KEY`": `"@downloaddash_api_key`"`n  }`n}"
Write-Host "Created: vercel.json" -ForegroundColor Green

# ============================================
# 5. CREATE package.json (if missing)
# ============================================
if (!(Test-Path "package.json")) {
    Write-Host "`nCreating package.json..." -ForegroundColor Yellow
    Set-Content -Path "package.json" -Value "{`n  `"name`": `"downloaddash-app`",`n  `"version`": `"1.0.0`",`n  `"private`": true,`n  `"scripts`": {`n    `"dev`": `"next dev`",`n    `"build`": `"next build`",`n    `"start`": `"next start`",`n    `"lint`": `"next lint`"`n  },`n  `"dependencies`": {`n    `"next`": `"14.0.4`",`n    `"react`": `"18.2.0`",`n    `"react-dom`": `"18.2.0`"`n  },`n  `"devDependencies`": {`n    `"@types/node`": `"20.10.5`",`n    `"@types/react`": `"18.2.45`",`n    `"@types/react-dom`": `"18.2.18`",`n    `"eslint`": `"8.56.0`",`n    `"eslint-config-next`": `"14.0.4`",`n    `"typescript`": `"5.3.3`"`n  }`n}"
    Write-Host "Created: package.json" -ForegroundColor Green
} else {
    Write-Host "package.json already exists" -ForegroundColor Green
}

# ============================================
# 6. CREATE tsconfig.json (if missing)
# ============================================
if (!(Test-Path "tsconfig.json")) {
    Write-Host "`nCreating tsconfig.json..." -ForegroundColor Yellow
    Set-Content -Path "tsconfig.json" -Value "{`n  `"compilerOptions`": {`n    `"target`": `"es5`",`n    `"lib`": [`"dom`", `"dom.iterable`", `"esnext`"],`n    `"allowJs`": true,`n    `"skipLibCheck`": true,`n    `"strict`": true,`n    `"noEmit`": true,`n    `"esModuleInterop`": true,`n    `"module`": `"esnext`",`n    `"moduleResolution`": `"bundler`",`n    `"resolveJsonModule`": true,`n    `"isolatedModules`": true,`n    `"jsx`": `"preserve`",`n    `"incremental`": true,`n    `"plugins`": [`n      {`n        `"name`": `"next`"`n      }`n    ],`n    `"paths`": {`n      `"@/*`": [`"./*`"]`n    }`n  },`n  `"include`": [`"next-env.d.ts`", `"**/*.ts`", `"**/*.tsx`", `".next/types/**/*.ts`"],`n  `"exclude`": [`"node_modules`"]`n}"
    Write-Host "Created: tsconfig.json" -ForegroundColor Green
} else {
    Write-Host "tsconfig.json already exists" -ForegroundColor Green
}

# ============================================
# 7. CREATE pages/_app.js (if missing)
# ============================================
if (!(Test-Path "pages/_app.js") -and !(Test-Path "pages/_app.tsx")) {
    Write-Host "`nCreating pages/_app.js..." -ForegroundColor Yellow
    if (!(Test-Path "pages")) { New-Item -ItemType Directory -Path "pages" -Force | Out-Null }
    Set-Content -Path "pages/_app.js" -Value "// pages/_app.js`nimport `"../styles/globals.css`"`n`nfunction MyApp({ Component, pageProps }) {`n  return <Component {...pageProps} />`n}`n`nexport default MyApp"
    Write-Host "Created: pages/_app.js" -ForegroundColor Green
} else {
    Write-Host "pages/_app.js already exists" -ForegroundColor Green
}

# ============================================
# 8. CREATE styles/globals.css (if missing)
# ============================================
if (!(Test-Path "styles/globals.css")) {
    Write-Host "`nCreating styles/globals.css..." -ForegroundColor Yellow
    if (!(Test-Path "styles")) { New-Item -ItemType Directory -Path "styles" -Force | Out-Null }
    Set-Content -Path "styles/globals.css" -Value "/* styles/globals.css */`n* {`n  box-sizing: border-box;`n  margin: 0;`n  padding: 0;`n}`n`nbody {`n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,`n    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;`n  background: #f5f5f5;`n}"
    Write-Host "Created: styles/globals.css" -ForegroundColor Green
} else {
    Write-Host "styles/globals.css already exists" -ForegroundColor Green
}

# ============================================
# 9. CREATE components/DownloadExample.jsx
# ============================================
Write-Host "`nCreating components/DownloadExample.jsx..." -ForegroundColor Yellow
if (!(Test-Path "components")) { New-Item -ItemType Directory -Path "components" -Force | Out-Null }

Set-Content -Path "components/DownloadExample.jsx" -Value "// components/DownloadExample.jsx`nimport { useState } from `"react`";`nimport downloadDash from `"../utils/downloadDash`";`n`nexport default function DownloadExample() {`n  const [url, setUrl] = useState(`"`");`n  const [platform, setPlatform] = useState(`"youtube`");`n  const [loading, setLoading] = useState(false);`n  const [result, setResult] = useState(null);`n  const [error, setError] = useState(null);`n`n  const handleDownload = async () => {`n    if (!url) {`n      setError(`"Please enter a URL`");`n      return;`n    }`n`n    setLoading(true);`n    setError(null);`n    setResult(null);`n`n    try {`n      const data = await downloadDash.download(platform, { url: url });`n      setResult(data);`n      console.log(`"Download result:`", data);`n    } catch (err) {`n      setError(err.message);`n      console.error(`"Download error:`", err);`n    } finally {`n      setLoading(false);`n    }`n  };`n`n  return (`n    <div style={{ maxWidth: `"600px`", margin: `"50px auto`", padding: `"20px`" }}>`n      <h1>DownloadDash</h1>`n      <div style={{ marginBottom: `"15px`" }}>`n        <label>Platform:</label>`n        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ marginLeft: `"10px`", padding: `"5px`" }}>`n          <option value=`"youtube`">YouTube</option>`n          <option value=`"instagram`">Instagram</option>`n          <option value=`"tiktok`">TikTok</option>`n          <option value=`"facebook`">Facebook</option>`n          <option value=`"pinterest`">Pinterest</option>`n          <option value=`"reddit`">Reddit</option>`n          <option value=`"x`">X (Twitter)</option>`n        </select>`n      </div>`n      <div style={{ display: `"flex`", gap: `"10px`" }}>`n        <input type=`"text`" value={url} onChange={(e) => setUrl(e.target.value)} placeholder=`"Enter video/photo URL`" style={{ flex: 1, padding: `"10px`", border: `"1px solid #ddd`", borderRadius: `"4px`" }} />`n        <button onClick={handleDownload} disabled={loading} style={{ padding: `"10px 20px`", background: `"#0070f3`", color: `"white`", border: `"none`", borderRadius: `"4px`", cursor: `"pointer`" }}>`n          {loading ? `"Loading...`" : `"Download`"}`n        </button>`n      </div>`n      {error && <div style={{ marginTop: `"20px`", padding: `"10px`", background: `"#fee`", color: `"#c00`", borderRadius: `"4px`" }}>Error: {error}</div>}`n      {result && (`n        <div style={{ marginTop: `"20px`", padding: `"15px`", background: `"#f0f7ff`", borderRadius: `"4px`" }}>`n          <h3>Success!</h3>`n          <p><strong>Title:</strong> {result.title}</p>`n          <p><strong>Platform:</strong> {result.platform}</p>`n          <p><strong>Type:</strong> {result.type}</p>`n          <div style={{ marginTop: `"10px`" }}>`n            <strong>Download URLs:</strong>`n            <ul>`n              {result.downloads.videoHD && <li>Video HD: <a href={result.downloads.videoHD} target=`"_blank`">Download</a></li>}`n              {result.downloads.videoSD && <li>Video SD: <a href={result.downloads.videoSD} target=`"_blank`">Download</a></li>}`n              {result.downloads.audio && <li>Audio: <a href={result.downloads.audio} target=`"_blank`">Download</a></li>}`n              {result.downloads.image && <li>Image: <a href={result.downloads.image} target=`"_blank`">Download</a></li>}`n            </ul>`n          </div>`n          <p><strong>Primary URL:</strong> <a href={result.primaryUrl} target=`"_blank`">{result.primaryUrl}</a></p>`n        </div>`n      )}`n    </div>`n  );`n}"
Write-Host "Created: components/DownloadExample.jsx" -ForegroundColor Green

# ============================================
# 10. CREATE pages/index.js (if missing)
# ============================================
if (!(Test-Path "pages/index.js") -and !(Test-Path "pages/index.tsx")) {
    Write-Host "`nCreating pages/index.js..." -ForegroundColor Yellow
    Set-Content -Path "pages/index.js" -Value "// pages/index.js`nimport DownloadExample from `"../components/DownloadExample`";`n`nexport default function Home() {`n  return <DownloadExample />;`n}"
    Write-Host "Created: pages/index.js" -ForegroundColor Green
} else {
    Write-Host "pages/index.js already exists" -ForegroundColor Green
}

# ============================================
# 11. CREATE README.md
# ============================================
Write-Host "`nCreating README.md..." -ForegroundColor Yellow
Set-Content -Path "README.md" -Value "# DownloadDash App`n`n## Setup Instructions`n`n1. Install dependencies:`n```bash`nnpm install`n````n`n2. Add your API key to .env.local:`n```bash`nDOWNLOADDASH_API_KEY=your_api_key_here`n````n`n3. Run the development server:`n```bash`nnpm run dev`n````n`n## API Routes`n`n- /api/smd/youtube/download - YouTube downloads`n- /api/smd/instagram/download - Instagram downloads`n- /api/smd/tiktok/download - TikTok downloads`n- /api/smd/facebook/download - Facebook downloads`n- /api/smd/pinterest/download - Pinterest downloads`n- /api/smd/reddit/download - Reddit downloads`n- /api/smd/x/download - X/Twitter downloads"
Write-Host "Created: README.md" -ForegroundColor Green

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ALL FILES CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nFiles Created:" -ForegroundColor Yellow
Write-Host "  api/smd/[...path].js" -ForegroundColor Green
Write-Host "  utils/downloadDash.js" -ForegroundColor Green
Write-Host "  .env.local" -ForegroundColor Green
Write-Host "  vercel.json" -ForegroundColor Green
if (!(Test-Path "package.json")) { Write-Host "  package.json" -ForegroundColor Green }
if (!(Test-Path "tsconfig.json")) { Write-Host "  tsconfig.json" -ForegroundColor Green }
if (!(Test-Path "pages/_app.js")) { Write-Host "  pages/_app.js" -ForegroundColor Green }
if (!(Test-Path "styles/globals.css")) { Write-Host "  styles/globals.css" -ForegroundColor Green }
Write-Host "  components/DownloadExample.jsx" -ForegroundColor Green
if (!(Test-Path "pages/index.js")) { Write-Host "  pages/index.js" -ForegroundColor Green }
Write-Host "  README.md" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Update .env.local with your actual API key" -ForegroundColor White
Write-Host "  2. Run: npm install" -ForegroundColor White
Write-Host "  3. Run: npm run dev" -ForegroundColor White
Write-Host "  4. Open: http://localhost:3000" -ForegroundColor White