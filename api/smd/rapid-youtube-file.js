const sanitizeFilename = (name) =>
  String(name || 'youtube-media')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'youtube-media';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' });
    return;
  }

  const { target, filename, type } = req.query || {};
  if (!target || typeof target !== 'string' || !/^https?:\/\//i.test(target)) {
    res.status(400).json({ detail: 'target is required' });
    return;
  }

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ detail: 'RapidAPI file download failed' });
      return;
    }

    const contentType = type || upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const arrayBuffer = await upstream.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(502).json({ detail: error?.message || 'RapidAPI file proxy failed' });
  }
}
