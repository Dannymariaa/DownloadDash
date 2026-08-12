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

const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const appendQueryParams = (target, query = {}) => {
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'path') return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (entry !== undefined && entry !== null) {
        target.searchParams.append(key, String(entry));
      }
    });
  });
};

const getRequestBody = (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-DownloadDash-Key, X-RapidAPI-Proxy-Secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || '').trim();
  const baseUrl = String(process.env.SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL).replace(/\/+$/, '');

  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message: 'DOWNLOADDASH_API_KEY is not configured on the Vercel serverless proxy.',
    });
  }

  const rawPath = req.query?.path;
  const parts = (Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [])
    .flatMap((part) => String(part).split('/'))
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)));

  if (!parts.length) {
    return json(res, 404, { success: false, message: 'API proxy path is missing.' });
  }

  const target = new URL(`${baseUrl}/${parts.join('/')}`);
  appendQueryParams(target, req.query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      body: getRequestBody(req),
      signal: controller.signal,
      headers: {
        Accept: req.headers.accept || 'application/json',
        'Content-Type': req.headers['content-type'] || 'application/json',
        'X-DownloadDash-Key': apiKey,
      },
    });

    upstream.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !HOP_BY_HOP_HEADERS.has(lowerKey) &&
        !['content-encoding', 'content-length', 'access-control-allow-origin'].includes(lowerKey)
      ) {
        res.setHeader(key, value);
      }
    });

    const contentType = upstream.headers.get('content-type') || '';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
    }
    return res.end(buffer);
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return json(res, 502, {
      success: false,
      message: timedOut
        ? 'The downloading engine took too long to return data. Please try again.'
        : 'The DownloadDash API proxy could not reach the Render backend.',
      detail: error?.message || 'Network fetch connection failed.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
