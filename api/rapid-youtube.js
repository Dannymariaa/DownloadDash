const RAPIDAPI_HOST =
  process.env.RAPIDAPI_YOUTUBE_HOST ||
  process.env.RAPIDAPI_HOST ||
  'youtube-media-downloader.p.rapidapi.com';

const RAPIDAPI_BASE_URL =
  process.env.RAPIDAPI_YOUTUBE_BASE_URL ||
  `https://${RAPIDAPI_HOST}`;

const RAPIDAPI_KEY =
  process.env.RAPIDAPI_YOUTUBE_KEY ||
  process.env.RAPIDAPI_KEY ||
  '';

const DOWNLOAD_PATH =
  process.env.RAPIDAPI_YOUTUBE_DOWNLOAD_PATH ||
  '/v2/video/details';

const PROGRESS_PATH =
  process.env.RAPIDAPI_YOUTUBE_PROGRESS_PATH ||
  '/progress';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DOWNLOAD_PATH_CANDIDATES = [
  DOWNLOAD_PATH,
  '/v2/video/details',
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

const walkValues = (input, visitor, depth = 0, seen = new Set()) => {
  if (input === null || input === undefined || depth > 4) return;
  if (typeof input !== 'object') return;
  if (seen.has(input)) return;
  seen.add(input);

  if (Array.isArray(input)) {
    for (const item of input) {
      visitor(item);
      walkValues(item, visitor, depth + 1, seen);
    }
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    visitor(value, key);
    walkValues(value, visitor, depth + 1, seen);
  }
};

const findStringByKeys = (payload, acceptedKeys) => {
  let match = null;
  walkValues(payload, (value, key) => {
    if (match) return;
    if (!key || typeof value !== 'string') return;
    if (acceptedKeys.includes(String(key))) {
      match = value;
    }
  });
  return match;
};

const extractJobId = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return firstDefined(
    payload.id,
    payload.jobId,
    payload.job_id,
    payload.progressId,
    payload.progress_id,
    payload.taskId,
    payload.task_id,
    payload.downloadId,
    payload.download_id,
    payload.token,
    payload.key,
    payload.hash,
    payload.data?.id,
    payload.data?.jobId,
    payload.data?.job_id,
    payload.data?.progressId,
    payload.data?.progress_id,
    payload.result?.id,
    payload.result?.progressId,
    payload.result?.progress_id,
    Array.isArray(payload.result) ? payload.result[0]?.id : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.id : undefined,
    findStringByKeys(payload, [
      'id',
      'jobId',
      'job_id',
      'progressId',
      'progress_id',
      'taskId',
      'task_id',
      'downloadId',
      'download_id',
      'token',
      'key',
      'hash',
    ])
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
    payload.link,
    payload.download,
    payload.downloadLink,
    payload.download_link,
    payload.fileUrl,
    payload.fileURL,
    payload.source,
    payload.result?.url,
    payload.result?.download_url,
    payload.result?.downloadUrl,
    payload.result?.dlurl,
    payload.result?.link,
    payload.result?.download,
    payload.result?.download_link,
    payload.data?.url,
    payload.data?.download_url,
    payload.data?.downloadUrl,
    payload.data?.dlurl,
    payload.data?.link,
    payload.data?.download,
    payload.data?.download_link,
    Array.isArray(payload.result) ? payload.result[0]?.url : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.download_url : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.downloadUrl : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.dlurl : undefined,
    Array.isArray(payload.result) ? payload.result[0]?.link : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.url : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.download_url : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.downloadUrl : undefined,
    Array.isArray(payload.data) ? payload.data[0]?.link : undefined,
    findStringByKeys(payload, [
      'url',
      'download_url',
      'downloadUrl',
      'dlurl',
      'file',
      'file_url',
      'link',
      'download',
      'downloadLink',
      'download_link',
      'fileUrl',
      'fileURL',
      'source',
    ]),
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
    payload?.thumbnails?.[0]?.url,
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

const collectMediaEntries = (payload, acceptedKeys) => {
  const entries = [];
  walkValues(payload, (value, key) => {
    if (!key || !acceptedKeys.includes(String(key))) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === 'object') entries.push(item);
      });
    }
  });
  return entries;
};

const normalizeVideoEntries = (payload) =>
  collectMediaEntries(payload, ['videos', 'video', 'video_formats', 'videoFormats']);

const normalizeAudioEntries = (payload) =>
  collectMediaEntries(payload, ['audios', 'audio', 'audio_formats', 'audioFormats']);

const mediaEntryUrl = (entry) =>
  firstDefined(
    entry?.url,
    entry?.link,
    entry?.downloadUrl,
    entry?.download_url,
    entry?.fileUrl,
    entry?.file_url
  ) || null;

const mediaEntryHeight = (entry) => {
  const raw = firstDefined(entry?.height, entry?.quality, entry?.label, entry?.resolution);
  const match = String(raw || '').match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
};

const pickBestVideo = (entries) => {
  const usable = entries.filter((entry) => /^https?:\/\//i.test(mediaEntryUrl(entry) || ''));
  usable.sort((a, b) => mediaEntryHeight(a) - mediaEntryHeight(b));
  return usable[usable.length - 1] || null;
};

const pickSdVideo = (entries) => {
  const usable = entries
    .filter((entry) => /^https?:\/\//i.test(mediaEntryUrl(entry) || ''))
    .filter((entry) => mediaEntryHeight(entry) > 0 && mediaEntryHeight(entry) <= 480);
  usable.sort((a, b) => mediaEntryHeight(a) - mediaEntryHeight(b));
  return usable[usable.length - 1] || null;
};

const pickBestAudio = (entries) => {
  const usable = entries.filter((entry) => /^https?:\/\//i.test(mediaEntryUrl(entry) || ''));
  return usable[0] || null;
};

const summarizePayload = (payload) => {
  try {
    const jsonText = JSON.stringify(payload);
    return jsonText.length > 500 ? `${jsonText.slice(0, 500)}...` : jsonText;
  } catch {
    return '[unserializable payload]';
  }
};

const collectStrings = (payload) => {
  const values = [];
  walkValues(payload, (value) => {
    if (typeof value === 'string') values.push(value);
  });
  return values;
};

const responseSeemsToMatchVideoId = (payload, expectedId) => {
  if (!expectedId) return true;
  const strings = collectStrings(payload);
  return strings.some((value) => value.includes(expectedId));
};

const extractYoutubeId = (inputUrl) => {
  try {
    const parsed = new URL(inputUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be') {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }
    if (host.includes('youtube.com')) {
      const watchId = parsed.searchParams.get('v');
      if (watchId) return watchId;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex !== -1 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
      const embedIndex = parts.indexOf('embed');
      if (embedIndex !== -1 && parts[embedIndex + 1]) return parts[embedIndex + 1];
    }
  } catch {}
  return null;
};

const mapFormatValue = (quality, extractAudio) => {
  if (extractAudio) return 'mp3';
  if (quality === 'lowest' || quality === 'low') return '360';
  if (quality === 'medium') return '480';
  if (quality === 'high') return '720';
  if (quality === 'highest') return '1080';
  if (Number.isFinite(Number(quality))) return String(Number(quality));
  return '720';
};

const buildAttemptBodies = ({ url, quality, extractAudio }) => {
  const id = extractYoutubeId(url);
  if (!id) {
    throw new Error('Could not extract a valid YouTube video ID from the URL');
  }

  return {
    expectedId: id,
    attempts: [
      {
        videoId: id,
        urlAccess: 'normal',
        videos: 'auto',
        audios: 'auto',
      },
      {
        id,
        urlAccess: 'normal',
        videos: 'auto',
        audios: 'auto',
      },
    ],
  };
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
  const { expectedId, attempts } = buildAttemptBodies({ url, quality, extractAudio });
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
    const baseMessage = lastError?.message || 'RapidAPI YouTube request could not be started';
    throw new Error(
      `${baseMessage}. ` +
      `If your RapidAPI provider uses a different start endpoint, set RAPIDAPI_YOUTUBE_DOWNLOAD_PATH in Vercel.`
    );
  }

  const videos = normalizeVideoEntries(initPayload);
  const audios = normalizeAudioEntries(initPayload);
  const bestVideo = pickBestVideo(videos);
  const sdVideo = pickSdVideo(videos) || bestVideo;
  const bestAudio = pickBestAudio(audios);

  if ((bestVideo || bestAudio) && responseSeemsToMatchVideoId(initPayload, expectedId)) {
    return {
      payload: initPayload,
      finalUrl: extractAudio ? mediaEntryUrl(bestAudio) : mediaEntryUrl(bestVideo || sdVideo),
      title: extractTitle(initPayload),
      thumbnail: extractThumbnail(initPayload),
      downloads: {
        videoHD: mediaEntryUrl(bestVideo),
        videoSD: mediaEntryUrl(sdVideo),
        audio: mediaEntryUrl(bestAudio),
      },
    };
  }

  const directUrl = extractDownloadUrl(initPayload);
  if (directUrl && responseSeemsToMatchVideoId(initPayload, expectedId)) {
    return {
      payload: initPayload,
      finalUrl: directUrl,
      title: extractTitle(initPayload),
      thumbnail: extractThumbnail(initPayload),
      downloads: {
        videoHD: extractAudio ? undefined : directUrl,
        videoSD: extractAudio ? undefined : directUrl,
        audio: extractAudio ? directUrl : mediaEntryUrl(bestAudio),
      },
    };
  }

  const id = extractJobId(initPayload);
  if (!id) {
    throw new Error(
      `RapidAPI did not return a download id or URL. Response sample: ${summarizePayload(initPayload)}`
    );
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
    if (finalUrl && responseSeemsToMatchVideoId(progressPayload, expectedId)) {
      return {
        payload: progressPayload,
        finalUrl,
        title: extractTitle(progressPayload) || extractTitle(initPayload),
        thumbnail: extractThumbnail(progressPayload) || extractThumbnail(initPayload),
        downloads: {
          videoHD: extractAudio ? undefined : finalUrl,
          videoSD: extractAudio ? undefined : finalUrl,
          audio: extractAudio ? finalUrl : mediaEntryUrl(bestAudio),
        },
      };
    }

    if (finalUrl && !responseSeemsToMatchVideoId(progressPayload, expectedId)) {
      throw new Error(
        `RapidAPI returned media for a different YouTube video. Expected ID ${expectedId}. ` +
        `Response sample: ${summarizePayload(progressPayload)}`
      );
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
    const toProxyUrl = (target, fallbackExt, mimeType) =>
      target
        ? `/api/rapid-youtube-file?target=${encodeURIComponent(target)}&filename=${encodeURIComponent(
            sanitizeFilename(resolved.title, fallbackExt)
          )}&type=${encodeURIComponent(mimeType)}`
        : undefined;

    const downloads = {
      videoHD: toProxyUrl(resolved.downloads?.videoHD, 'mp4', 'video/mp4'),
      videoSD: toProxyUrl(resolved.downloads?.videoSD, 'mp4', 'video/mp4'),
      audio: toProxyUrl(resolved.downloads?.audio, 'mp3', 'audio/mpeg'),
    };

    const proxyUrl =
      downloads.videoHD ||
      downloads.videoSD ||
      downloads.audio ||
      toProxyUrl(resolved.finalUrl, ext, extractAudio ? 'audio/mpeg' : 'video/mp4');

    return json(res, 200, {
      success: true,
      title: resolved.title,
      thumbnail: resolved.thumbnail,
      platform: 'youtube',
      type: extractAudio ? 'audio' : 'video',
      downloads,
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
