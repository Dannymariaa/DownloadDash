const DEFAULT_UPSTREAM_BASE_URL = 'https://api.downloaddash.store';
const REQUEST_TIMEOUT_MS = 55000;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function json(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeUpstreamBaseUrl(value) {
  let normalized = String(value || DEFAULT_UPSTREAM_BASE_URL)
    .trim()
    .replace(/\/+$/, '');

  normalized = normalized.replace(/\/api\/smd$/i, '');
  normalized = normalized.replace(/\/api$/i, '');
  normalized = normalized.replace(/\/smd$/i, '');

  return normalized || DEFAULT_UPSTREAM_BASE_URL;
}

function asPathParts(value) {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((part) => String(part).split('/'))
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)));
}

function pathPartsFromUrl(req) {
  const requestUrl = req.url || req.originalUrl;

  if (!requestUrl) {
    return [];
  }

  const parsed = new URL(requestUrl, 'https://downloaddash.local');

  const match = parsed.pathname.match(/^\/api\/smd\/?(.*)$/);

  if (!match || !match[1]) {
    return [];
  }

  return asPathParts(match[1]);
}

function appendQueryParams(target, query = {}) {
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'path' || key === '...path') {
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
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  if (req.body === undefined || req.body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  return JSON.stringify(req.body);
}

function buildForwardHeaders(req, apiKey) {
  const headers = {
    Accept: req.headers.accept || 'application/json',
    'X-DownloadDash-Key': apiKey,
  };

  const contentType = req.headers['content-type'];

  if (contentType) {
    headers['Content-Type'] = contentType;
  } else if (req.method !== 'GET' && req.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  if (req.headers['x-rapidapi-proxy-secret']) {
    headers['X-RapidAPI-Proxy-Secret'] =
      req.headers['x-rapidapi-proxy-secret'];
  }

  return headers;
}

export default async function handler(req, res) {
  console.info('[DownloadDash SMD Proxy] START');
  console.info('Method:', req.method);
  console.info('URL:', req.url);
  console.info('Query:', req.query);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Accept,Authorization,X-DownloadDash-Key,X-RapidAPI-Proxy-Secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || '').trim();

  const baseUrl = normalizeUpstreamBaseUrl(
    process.env.SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL
  );

  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message:
        'DOWNLOADDASH_API_KEY is not configured on the Vercel serverless function.',
    });
  }

  let parts = asPathParts(req.query?.path);

  if (!parts.length) {
    parts = asPathParts(req.query?.['...path']);
  }

  if (!parts.length) {
    parts = pathPartsFromUrl(req);
  }

  if (!parts.length) {
    return json(res, 404, {
      success: false,
      message: 'API proxy path is missing.',
    });
  }

  let forwardParts;

  if (parts.length === 1 && parts[0] === 'test') {
    forwardParts = ['api', 'v1', 'test'];
  } else if (parts.length >= 2 && parts[1] === 'download') {
    forwardParts = ['api', 'v1', parts[0], 'download'];
  } else {
    forwardParts = ['api', 'v1', ...parts];
  }

  const target = new URL(`${baseUrl}/${forwardParts.join('/')}`);

  appendQueryParams(target, req.query);

  console.info('Forward URL:', target.toString());

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

    console.info('Upstream Status:', upstream.status);

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();

      if (
        HOP_BY_HOP_HEADERS.has(lower) ||
        lower === 'content-length' ||
        lower === 'content-encoding' ||
        lower === 'access-control-allow-origin'
      ) {
        return;
      }

      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);

    if (!res.getHeader('Content-Type')) {
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') || 'application/octet-stream'
      );
    }

    return res.end(buffer);
  } catch (error) {
    const timedOut = error?.name === 'AbortError';

    return json(res, 502, {
      success: false,
      message: timedOut
        ? 'The downloading engine took too long to return data. Please try again.'
        : 'The DownloadDash API proxy could not reach the Render backend.',
      detail: error?.message || 'Network connection failed.',
    });
  } finally {
    clearTimeout(timeout);
  }
}