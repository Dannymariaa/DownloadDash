const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = Number(process.env.TELEGRAM_BRIDGE_PORT || 3004);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.SMD_TELEGRAM_BOT_TOKEN || '';
const SESSION_DIR = process.env.TELEGRAM_SESSION_DIR || path.join(__dirname, '../auth/telegram');
const DOWNLOADS_DIR = process.env.TELEGRAM_DOWNLOADS_DIR || path.join(__dirname, '../downloads/telegram');
const STATE_PATH = path.join(SESSION_DIR, 'state.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.ogg' || ext === '.opus') return 'audio/ogg';
  return 'application/octet-stream';
}

function getMediaTypeByExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image';
  if (['.mp4', '.mov', '.mkv', '.webm'].includes(ext)) return 'video';
  if (['.mp3', '.m4a', '.ogg', '.opus', '.wav'].includes(ext)) return 'audio';
  return 'file';
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function writeState(nextState) {
  ensureDir(SESSION_DIR);
  fs.writeFileSync(STATE_PATH, JSON.stringify(nextState, null, 2));
}

function sanitizeFilename(name) {
  return String(name || 'telegram_media')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

async function botApi(method, params) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram API error (${res.status})`);
  }
  return data.result;
}

async function downloadTelegramFile(fileId) {
  const file = await botApi('getFile', { file_id: fileId });
  const filePath = file?.file_path;
  if (!filePath) throw new Error('No file_path returned');

  const ext = path.extname(filePath) || '.bin';
  const filename = sanitizeFilename(`telegram_media_${Date.now()}_${fileId}${ext}`);
  const targetPath = path.join(DOWNLOADS_DIR, filename);

  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to download file (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);
  return filename;
}

async function syncUpdates(limit = 50) {
  ensureDir(SESSION_DIR);
  ensureDir(DOWNLOADS_DIR);

  const state = readState();
  const offset = state.last_update_id ? state.last_update_id + 1 : undefined;

  const updates = await botApi('getUpdates', { offset, limit });
  let savedCount = 0;
  let lastUpdateId = state.last_update_id || 0;

  for (const update of updates || []) {
    if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

    const message = update.message || update.channel_post || update.edited_message;
    if (!message) continue;

    const mediaCandidates = [];

    if (message.photo?.length) {
      mediaCandidates.push({ file_id: message.photo[message.photo.length - 1].file_id });
    }
    if (message.video?.file_id) {
      mediaCandidates.push({ file_id: message.video.file_id });
    }
    if (message.document?.file_id) {
      mediaCandidates.push({ file_id: message.document.file_id });
    }
    if (message.audio?.file_id) {
      mediaCandidates.push({ file_id: message.audio.file_id });
    }
    if (message.voice?.file_id) {
      mediaCandidates.push({ file_id: message.voice.file_id });
    }
    if (message.animation?.file_id) {
      mediaCandidates.push({ file_id: message.animation.file_id });
    }

    for (const media of mediaCandidates) {
      try {
        await downloadTelegramFile(media.file_id);
        savedCount += 1;
      } catch (e) {
        console.log('[Telegram bridge] Failed to download file:', e?.message || e);
      }
    }
  }

  writeState({ last_update_id: lastUpdateId, last_synced_at: new Date().toISOString() });
  return { savedCount, lastUpdateId };
}

function listDownloadedMedia() {
  ensureDir(DOWNLOADS_DIR);
  const files = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  const items = files.map((filename) => {
    const fullPath = path.join(DOWNLOADS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const type = getMediaTypeByExt(filename);
    return {
      id: filename,
      filename,
      type,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
      url: `/downloads/${encodeURIComponent(filename)}`,
    };
  });

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/status') {
      const state = readState();
      return sendJson(res, 200, {
        configured: !!BOT_TOKEN,
        lastUpdateId: state.last_update_id || null,
        lastSyncedAt: state.last_synced_at || null,
      });
    }

    if (req.method === 'POST' && url.pathname === '/sync') {
      const limit = Number(url.searchParams.get('limit') || 50);
      const result = await syncUpdates(Number.isFinite(limit) ? limit : 50);
      return sendJson(res, 200, { success: true, ...result });
    }

    if (req.method === 'GET' && url.pathname === '/downloads') {
      return sendJson(res, 200, { items: listDownloadedMedia() });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/downloads/')) {
      const requested = decodeURIComponent(url.pathname.replace('/downloads/', ''));
      const safeName = path.basename(requested);
      const fullPath = path.join(DOWNLOADS_DIR, safeName);

      if (!fs.existsSync(fullPath)) return sendJson(res, 404, { error: 'Not found' });

      res.statusCode = 200;
      res.setHeader('Content-Type', getMimeType(safeName));
      res.setHeader('Cache-Control', 'no-store');

      const stream = fs.createReadStream(fullPath);
      stream.on('error', () => sendJson(res, 500, { error: 'Failed to read file' }));
      return stream.pipe(res);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    return sendJson(res, 500, { error: e?.message || 'Internal error' });
  }
});

ensureDir(SESSION_DIR);
ensureDir(DOWNLOADS_DIR);

server.listen(PORT, () => {
  console.log(`Telegram bridge running on port ${PORT}`);
  if (!BOT_TOKEN) {
    console.log('Telegram bridge warning: TELEGRAM_BOT_TOKEN is not set.');
  }
});
