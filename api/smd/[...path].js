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

const getRequestPath = (req) => {
  const rawPath = req.query?.path;
  const parts = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  return `/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`;
};

const appendQuery = (target, req) => {
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== undefined) target.searchParams.append(key, String(item));
    }
  }
};

const buildUpstreamHeaders = (req) => {
  const headers = {
    Accept: req.headers.accept || 'application/json',
    'X-DownloadDash-Key': getDownloadDashApiKey(),
  };

  const contentType = req.headers['content-type'];
  if (contentType) headers['Content-Type'] = contentType;

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

  const target = new URL(`${getUpstreamBaseUrl()}${getRequestPath(req)}`);
  appendQuery(target, req);

  const init = {
    method: req.method,
    headers: buildUpstreamHeaders(req),
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }

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
  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status).send(body);
}
