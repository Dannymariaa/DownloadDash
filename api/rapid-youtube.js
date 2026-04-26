const RAPIDAPI_HOST =
  process.env.RAPIDAPI_YOUTUBE_HOST ||
  process.env.RAPIDAPI_HOST ||
  'youtube-mp4-mp3-downloader.p.rapidapi.com';

const RAPIDAPI_BASE_URL =
  process.env.RAPIDAPI_YOUTUBE_BASE_URL ||
  `https://${RAPIDAPI_HOST}/api/v1`;

const RAPIDAPI_KEY =
  process.env.RAPIDAPI_YOUTUBE_KEY ||
  process.env.RAPIDAPI_KEY ||
  '';

const DOWNLOAD_PATH =
  process.env.RAPIDAPI_YOUTUBE_DOWNLOAD_PATH ||
  '/download';

const PROGRESS_PATH =
  process.env.RAPIDAPI_YOUTUBE_PROGRESS_PATH ||
  '/progress';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DOWNLOAD_PATH_CANDIDATES = [
  DOWNLOAD_PATH,
  '/download',
  '/convert',
  '/video_info',
];

const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const getHeaders = () => ({
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
  'Content-Type': 'application/json',
});

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const extractJobId = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return firstDefined(
    payload.id,
    payload.jobId,
    payload.job_id,
    payload.downloadId,
    payload.download_id,
    payload.token,
    payload.data?.id,
    payload.data?.jobId,
    payload.data?.job_id,
    payload.result?.id,
    Array.isArray(payload.result) ? payload.result[0]?.id : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.id : undefined
  ) || null;
};

const extractDownloadUrl = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload.url,
    payload.download_url,
    payload.downloadUrl,
    payload.dlurl,
    payload.file,
    payload.file_url,
    payload.result?.url,
    payload.result?.download_url,
    payload.result?.downloadUrl,
    payload.result?.dlurl,
    payload.data?.url,
    payload.data?.download_url,
    payload.data?.downloadUrl,
    payload.data?.dlurl,
    Array.isArray(payload.result) ? payload.result[0]?.url : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.download_url : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.downloadUrl : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.dlurl : undefined,
  ];

  return candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value)) || null;
};

const extractTitle = (payload) =>
  firstDefined(
    payload?.title,
    payload?.video_title,
    payload?.data?.title,
    payload?.result?.title,
    Array.isArray(payload?.result) ? payload.result[0]?.title : undefined
  ) || 'YouTube Media';

const extractThumbnail = (payload) =>
  firstDefined(
    payload?.thumbnail,
    payload?.thumbnail_url,
    payload?.thumb,
    payload?.image,
    payload?.data?.thumbnail,
    payload?.data?.thumbnail_url,
    payload?.result?.thumbnail,
    payload?.result?.thumbnail_url,
    Array.isArray(payload?.result) ? payload.result[0]?.thumbnail : undefined,
    Array.isArray(payload?.result) ? payload.result[0]?.thumbnail_url : undefined
  ) || null;

const extractStatus = (payload) =>
  String(
    firstDefined(payload?.status, payload?.state, payload?.message, payload?.result?.status, payload?.data?.status) ||
      ''
  ).toLowerCase();

const sanitizeFilename = (name, fallbackExt = 'mp4') => {
  const base = String(name || 'youtube-media')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return base ? `${base}.${fallbackExt}` : `youtube-media.${fallbackExt}`;
};

const buildAttemptBodies = ({ url, quality, extractAudio }) => {
  const numericQuality =
    quality === 'lowest' ? 360 :
    quality === 'low' ? 360 :
    quality === 'medium' ? 480 :
    quality === 'high' ? 720 :
    quality === 'highest' ? 1080 :
    Number.isFinite(Number(quality)) ? Number(quality) : 720;

  const format = extractAudio ? 'mp3' : 'mp4';

  return [
    { url, format, quality: numericQuality },
    { url, format, quality: String(numericQuality) },
    { url, type: format, quality: numericQuality },
    { url, type: format, quality: String(numericQuality) },
    { url, mode: format, quality: numericQuality },
  ];
};

const callRapidAttempt = async ({ body, method, path }) => {
  const target = new URL(`${RAPIDAPI_BASE_URL}${path}`);

  let response;
  if (method === 'GET') {
    Object.entries(body).forEach(([key, value]) => target.searchParams.set(key, String(value)));
    response = await fetch(target, { method: 'GET', headers: getHeaders() });
  } else {
    response = await fetch(target, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail =
      data?.message ||
      data?.error ||
      data?.detail ||
      `RapidAPI request failed (${response.status})`;
    throw new Error(detail);
  }

  return data;
};

const resolveRapidDownload = async ({ url, quality, extractAudio }) => {
  const attempts = buildAttemptBodies({ url, quality, extractAudio });
  const methods = ['POST', 'GET'];
  let initPayload = null;
  let lastError = null;

  for (const path of DOWNLOAD_PATH_CANDIDATES) {
    for (const body of attempts) {
      for (const method of methods) {
        try {
          initPayload = await callRapidAttempt({ body, method, path });
          if (initPayload) break;
        } catch (error) {
          lastError = error;
        }
      }
      if (initPayload) break;
    }
    if (initPayload) break;
  }

  if (!initPayload) {
    throw new Error(lastError?.message || 'RapidAPI YouTube request could not be started');
  }

  const directUrl = extractDownloadUrl(initPayload);
  if (directUrl) {
    return {
      payload: initPayload,
      finalUrl: directUrl,
      title: extractTitle(initPayload),
      thumbnail: extractThumbnail(initPayload),
    };
  }

  const id = extractJobId(initPayload);
  if (!id) {
    throw new Error('RapidAPI did not return a download id or URL');
  }

  const progressUrl = new URL(`${RAPIDAPI_BASE_URL}${PROGRESS_PATH}`);
  progressUrl.searchParams.set('id', id);

  let progressPayload = null;
  for (let i = 0; i < 12; i += 1) {
    const response = await fetch(progressUrl, { method: 'GET', headers: getHeaders() });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const detail =
        data?.message ||
        data?.error ||
        data?.detail ||
        `RapidAPI progress failed (${response.status})`;
      throw new Error(detail);
    }

    progressPayload = data;
    const finalUrl = extractDownloadUrl(progressPayload);
    if (finalUrl) {
      return {
        payload: progressPayload,
        finalUrl,
        title: extractTitle(progressPayload) || extractTitle(initPayload),
        thumbnail: extractThumbnail(progressPayload) || extractThumbnail(initPayload),
      };
    }

    const status = extractStatus(progressPayload);
    if (status.includes('error') || status.includes('fail')) {
      throw new Error(progressPayload?.message || progressPayload?.error || 'RapidAPI download failed');
    }

    await sleep(1500);
  }

  throw new Error(
    progressPayload?.message ||
      progressPayload?.error ||
      'RapidAPI timed out while preparing the YouTube download'
  );
};

export default async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  if (!RAPIDAPI_KEY) {
    return json(res, 500, {
      success: false,
      error: 'RapidAPI key is not configured on the server',
    });
  }

  try {
    const input = req.method === 'GET' ? req.query || {} : req.body || {};
    const { url, quality = 'high', extractAudio = false } = input;
    if (!url || typeof url !== 'string') {
      return json(res, 400, { success: false, error: 'url is required' });
    }

    const resolved = await resolveRapidDownload({ url, quality, extractAudio });
    const ext = extractAudio ? 'mp3' : 'mp4';
    const proxyUrl = `/api/rapid-youtube-file?target=${encodeURIComponent(resolved.finalUrl)}&filename=${encodeURIComponent(
      sanitizeFilename(resolved.title, ext)
    )}&type=${encodeURIComponent(extractAudio ? 'audio/mpeg' : 'video/mp4')}`;

    return json(res, 200, {
      success: true,
      title: resolved.title,
      thumbnail: resolved.thumbnail,
      platform: 'youtube',
      type: extractAudio ? 'audio' : 'video',
      downloads: extractAudio
        ? { audio: proxyUrl }
        : { videoHD: proxyUrl, videoSD: proxyUrl, audio: undefined },
      downloadUrl: proxyUrl,
      raw: resolved.payload,
    });
  } catch (error) {
    return json(res, 502, {
      success: false,
      error: error?.message || 'RapidAPI YouTube request failed',
    });
  }
}
