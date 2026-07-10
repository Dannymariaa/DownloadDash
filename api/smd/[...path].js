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

export default async function handler(req, res) {
  // Handle CORS Preflight Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-DownloadDash-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = String(process.env.DOWNLOADDASH_API_KEY || '').trim();
  const baseUrl = String(process.env.SMD_API_BASE_URL || process.env.VITE_SMD_API_BASE_URL || DEFAULT_UPSTREAM_BASE_URL).replace(/\/+$/, '');

  let mediaUrl = '';
  
  // Safely capture payload URL from POST body
  if (req.body) {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      mediaUrl = payload.url || '';
    } catch (e) {
      mediaUrl = '';
    }
  }

  // Fallback to query parameter if body wasn't fully read
  if (!mediaUrl && req.query.url) {
    mediaUrl = req.query.url;
  }

  if (!mediaUrl) {
    return json(res, 400, { success: false, message: 'No media URL provided.' });
  }

  // Deduce platform from path parts
  const rawPath = req.query?.path;
  const parts = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const inferredPlatform = parts[0] || 'instagram';

  // --- MAP TO EXACT FLASK ROUTE ---
  // Transforms /api/smd/youtube/download POST -> /api/v1/extract?url=...&platform=... GET
  const target = new URL(`${baseUrl}/api/v1/extract`);
  target.searchParams.append('url', mediaUrl.trim());
  target.searchParams.append('platform', inferredPlatform.toLowerCase());

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET', // Matches app.py @app.route("/api/v1/extract", methods=["GET"])
      headers: {
        'Accept': 'application/json',
        'X-DownloadDash-Key': apiKey,
      }
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      try {
        const errorJson = JSON.parse(errorText);
        return json(res, upstream.status, errorJson);
      } catch {
        return json(res, upstream.status, { success: false, error: 'Upstream server error', detail: errorText });
      }
    }

    const data = await upstream.json();
    
    // Forward response headers while dropping hop-by-hop restrictions
    upstream.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lowerKey) && lowerKey !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    return res.status(upstream.status).json(data);

  } catch (error) {
    return json(res, 502, {
      success: false,
      message: 'The downloading engine took too long to return data. Please try again.',
      detail: error?.message || 'Network fetch connection timeout.'
    });
  }
}