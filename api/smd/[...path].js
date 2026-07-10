const DEFAULT_UPSTREAM_BASE_URL = 'https://api.downloaddash.store';

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

const getUpstreamBaseUrl = () =>
  String(process.env.SMD_API_BASE_URL || process.env.VITE_SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL)
    .replace(/\/+$/, '');

const getDownloadDashApiKey = () => String(process.env.DOWNLOADDASH_API_KEY || '').trim();

const buildUpstreamHeaders = (req) => {
  const headers = {
    Accept: 'application/json',
    'X-DownloadDash-Key': getDownloadDashApiKey(),
  };
  return headers;
};

const copyResponseHeaders = (upstream, res) => {
  upstream.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey) || lowerKey === 'content-encoding') return;
    res.setHeader(key, value);
  });
};

export default async function handler(req, res) {
  const apiKey = getDownloadDashApiKey();
  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message: 'DownloadDash API key is not configured on Vercel.',
    });
  }

  let mediaUrl = '';
  
  // Extract URL from POST body safely
  if (req.body) {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      mediaUrl = payload.url || '';
    } catch (e) {
      mediaUrl = '';
    }
  }

  // Fallback check query if body was not parsed
  if (!mediaUrl && req.query.url) {
    mediaUrl = req.query.url;
  }

  if (!mediaUrl) {
    return json(res, 400, { success: false, message: 'No media URL provided.' });
  }

  // Extract the requested platform from the trailing endpoint path name cleanly
  const rawPath = req.query?.path;
  const parts = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const inferredPlatform = parts[0] || 'instagram';

  // Construct the single correct endpoint expected by app.py
  const target = new URL(`${getUpstreamBaseUrl()}/api/v1/extract`);
  target.searchParams.append('url', mediaUrl.trim());
  target.searchParams.append('platform', inferredPlatform.toLowerCase());

  const init = {
    method: 'GET', // app.py route uses GET method
    headers: buildUpstreamHeaders(req),
    redirect: 'follow',
  };

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    return json(res, 502, {
      success: false,
      message: `Unable to reach the DownloadDash API at ${getUpstreamBaseUrl()}.`,
      detail: error?.message || 'Network request failed.',
    });
  }

  copyResponseHeaders(upstream, res);
  
  const arrayBuffer = await upstream.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  
  res.status(upstream.status).end(body);
}