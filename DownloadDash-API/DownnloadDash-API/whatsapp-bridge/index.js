const http = require('http');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SESSION_DIR = path.join(__dirname, '../auth/whatsapp');
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');

let sock = null;
let qrCode = null;

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
  return 'application/octet-stream';
}

function listDownloadedStatuses() {
  ensureDir(DOWNLOADS_DIR);
  const files = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => /^whatsapp_status_\\d+\\.(jpg|jpeg|png|webp|mp4)$/i.test(name));

  const items = files.map((filename) => {
    const fullPath = path.join(DOWNLOADS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const ext = path.extname(filename).toLowerCase();
    const type = ext === '.mp4' ? 'video' : 'image';
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function connectToWhatsApp() {
  ensureDir(SESSION_DIR);
  ensureDir(DOWNLOADS_DIR);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Media Downloader', 'Chrome', '1.0.0'],
    syncFullHistory: true,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCode = qr;
      console.log('QR Code updated, scan with WhatsApp');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('WhatsApp connected!');
      qrCode = null;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages || []) {
      if (msg?.key?.remoteJid === 'status@broadcast') await handleStatusMessage(msg);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

async function handleStatusMessage(msg) {
  try {
    if (!msg?.message) return;

    if (msg.message?.imageMessage || msg.message?.videoMessage) {
      const mediaType = msg.message.imageMessage ? 'image' : 'video';
      const buffer = await downloadMedia(msg);
      const filename = `whatsapp_status_${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      fs.writeFileSync(path.join(DOWNLOADS_DIR, filename), buffer);
      console.log('Status saved:', filename);
    }
  } catch (e) {
    console.error('Failed to handle status:', e?.message || e);
  }
}

async function downloadMedia(msg) {
  const stream = await sock.downloadMediaMessage(msg);
  if (Buffer.isBuffer(stream)) return stream;

  const buffers = [];
  for await (const chunk of stream) buffers.push(chunk);
  return Buffer.concat(buffers);
}

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/qr') {
      return sendJson(res, 200, {
        qr: qrCode,
        message: qrCode ? 'Scan with WhatsApp' : 'Already connected or no QR available',
      });
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      return sendJson(res, 200, {
        connected: !!sock?.user,
        user: sock?.user || null,
      });
    }

    if (req.method === 'GET' && url.pathname === '/downloads') {
      return sendJson(res, 200, { items: listDownloadedStatuses() });
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

    if (req.method === 'POST' && url.pathname === '/download-status') {
      await readJsonBody(req); // placeholder
      return sendJson(res, 200, { message: 'Status download initiated' });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    return sendJson(res, 500, { error: e?.message || 'Internal error' });
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp bridge running on port ${PORT}`);
  connectToWhatsApp().catch((e) => console.error('WhatsApp connect failed:', e));
});
