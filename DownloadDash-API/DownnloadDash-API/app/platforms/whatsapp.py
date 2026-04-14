import asyncio
import json
import os
import uuid
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from loguru import logger
import websockets
import aiohttp
import base64

from app.platforms.base import BasePlatformDownloader
from app.models.schemas import DownloadRequest, Platform, Quality, MediaType
from app.utils import file_handler

class WhatsAppDownloader(BasePlatformDownloader):
    """WhatsApp downloader using WebSocket connection"""
    
    def __init__(self, bridge_url: str = "ws://localhost:3001"):
        super().__init__()
        self.bridge_url = bridge_url
        self.ws = None
        self.connection_id = None
        self.qr_code = None
        self.is_connected = False
        self.message_handlers = []
        self.status_handlers = []
        
    async def initialize(self):
        """Initialize WebSocket connection to WhatsApp bridge"""
        try:
            self.ws = await websockets.connect(self.bridge_url)
            logger.info("Connected to WhatsApp bridge")
            
            # Start listener task
            asyncio.create_task(self._listen())
            return True
        except Exception as e:
            logger.error(f"Failed to connect to WhatsApp bridge: {e}")
            return False
    
    async def _listen(self):
        """Listen for messages from bridge"""
        try:
            async for message in self.ws:
                data = json.loads(message)
                
                if data['type'] == 'qr':
                    self.qr_code = data['qr']
                    logger.info("QR code received")
                    
                elif data['type'] == 'connected':
                    self.is_connected = True
                    self.connection_id = data['connection_id']
                    logger.info(f"WhatsApp connected: {data.get('user')}")
                    
                elif data['type'] == 'message':
                    # Handle incoming message
                    for handler in self.message_handlers:
                        await handler(data['data'])
                        
                elif data['type'] == 'status':
                    # Handle status update
                    for handler in self.status_handlers:
                        await handler(data['data'])
                        
                elif data['type'] == 'disconnected':
                    self.is_connected = False
                    logger.warning("WhatsApp disconnected")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.error("WhatsApp bridge connection closed")
        except Exception as e:
            logger.error(f"WhatsApp listener error: {e}")
    
    async def authenticate(self, credentials: dict = None) -> bool:
        """Authenticate with WhatsApp via QR code"""
        if not self.ws:
            await self.initialize()
        
        # Request QR code
        await self.ws.send(json.dumps({
            'type': 'get_qr'
        }))
        
        # Wait for QR code
        for _ in range(30):  # 30 second timeout
            if self.qr_code:
                logger.info("QR code available for scanning")
                return True
            await asyncio.sleep(1)
        
        return False
    
    async def download(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download WhatsApp media from message ID"""
        if not self.is_connected:
            return {'success': False, 'error': 'WhatsApp not connected'}
        
        # Extract message ID from URL or request
        url_str = str(request.url)
        message_id = None
        
        if 'chat.whatsapp.com' in url_str:
            # This is a group invite, not a media URL
            return {'success': False, 'error': 'Group invites not supported'}
        elif '/message/' in url_str:
            message_id = url_str.split('/')[-1]
        
        if not message_id and request.media_type == MediaType.STATUS:
            # For status downloads, we need to specify which status
            return await self.download_status(request)
        
        # Request download from bridge
        await self.ws.send(json.dumps({
            'type': 'download_media',
            'message_id': message_id,
            'quality': request.quality.value
        }))
        
        # Wait for response
        # In production, you'd have a proper request-response pattern
        return {'success': True, 'status': 'processing'}
    
    async def download_status(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download WhatsApp status"""
        if not self.is_connected:
            return {'success': False, 'error': 'WhatsApp not connected'}
        
        # Request recent statuses
        await self.ws.send(json.dumps({
            'type': 'get_statuses'
        }))
        
        # In production, you'd handle the status list and then download
        return {'success': True, 'message': 'Status download requested'}
    
    async def download_story(self, user_id: str, story_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download WhatsApp status (stories)"""
        if not self.is_connected:
            return []
        
        # Request status download
        await self.ws.send(json.dumps({
            'type': 'download_status',
            'user_id': user_id,
            'status_id': story_id
        }))
        
        return [{'status': 'requested', 'user_id': user_id}]
    
    async def download_profile_picture(self, username: str) -> Dict[str, Any]:
        """Download WhatsApp profile picture"""
        if not self.is_connected:
            return {'success': False, 'error': 'WhatsApp not connected'}
        
        # Request profile picture
        await self.ws.send(json.dumps({
            'type': 'get_profile_pic',
            'jid': username
        }))
        
        return {'success': True, 'status': 'requested'}
    
    async def get_user_info(self, username: str) -> Dict[str, Any]:
        """Get WhatsApp user info"""
        if not self.is_connected:
            return {}
        
        # Request user info
        await self.ws.send(json.dumps({
            'type': 'get_user_info',
            'jid': username
        }))
        
        return {'status': 'requested'}
    
    def add_message_handler(self, handler: Callable):
        """Add handler for incoming messages"""
        self.message_handlers.append(handler)
    
    def add_status_handler(self, handler: Callable):
        """Add handler for status updates"""
        self.status_handlers.append(handler)
    
    async def get_qr_code(self) -> Optional[str]:
        """Get current QR code"""
        return self.qr_code
    
    async def close(self):
        """Close WebSocket connection"""
        if self.ws:
            await self.ws.close()
        await super().close()

# WhatsApp Bridge Server (Node.js) - Save as whatsapp-bridge/index.js
"""
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3001;
const SESSION_DIR = path.join(__dirname, '../auth/whatsapp');

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Store active connections
let sock = null;
let connections = new Map();

wss.on('connection', async (ws) => {
    console.log('Client connected to WhatsApp bridge');
    const connectionId = generateId();
    connections.set(connectionId, ws);
    
    // Initialize WhatsApp connection
    if (!sock) {
        await initializeWhatsApp(ws);
    }
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            await handleMessage(ws, data);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        connections.delete(connectionId);
    });
});

async function initializeWhatsApp(ws) {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Media Downloader', 'Chrome', '1.0.0'],
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: true,
        shouldIgnoreJid: (jid) => false, // Don't ignore any messages
    });
    
    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Send QR code to all connected clients
            broadcast({
                type: 'qr',
                qr: qr,
                timestamp: new Date().toISOString()
            });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            
            broadcast({
                type: 'disconnected',
                reason: lastDisconnect?.error?.message || 'Unknown',
                reconnect: shouldReconnect
            });
            
            if (shouldReconnect) {
                initializeWhatsApp(ws);
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connected!');
            broadcast({
                type: 'connected',
                connection_id: connectionId,
                user: sock.user,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            // Check for status messages
            if (msg.key.remoteJid === 'status@broadcast') {
                await handleStatusMessage(msg);
            }
            
            // Check for view-once messages
            if (msg.message?.viewOnceMessage?.message) {
                await handleViewOnceMessage(msg);
            }
            
            // Broadcast message to clients
            broadcast({
                type: 'message',
                data: {
                    id: msg.key.id,
                    from: msg.key.remoteJid,
                    fromMe: msg.key.fromMe,
                    timestamp: msg.messageTimestamp,
                    type: getMessageType(msg),
                    hasMedia: hasMedia(msg)
                }
            });
        }
    });
    
    // Handle status updates
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.key.remoteJid === 'status@broadcast') {
                broadcast({
                    type: 'status_update',
                    data: {
                        id: update.key.id,
                        status: update.status,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }
    });
    
    // Save credentials
    sock.ev.on('creds.update', saveCreds);
}

async function handleMessage(ws, data) {
    switch (data.type) {
        case 'get_qr':
            // QR code is sent automatically during connection
            break;
            
        case 'download_media':
            await handleMediaDownload(ws, data);
            break;
            
        case 'get_statuses':
            await handleGetStatuses(ws);
            break;
            
        case 'download_status':
            await handleStatusDownload(ws, data);
            break;
            
        case 'get_profile_pic':
            await handleGetProfilePic(ws, data);
            break;
            
        case 'get_user_info':
            await handleGetUserInfo(ws, data);
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown command'
            }));
    }
}

async function handleMediaDownload(ws, data) {
    try {
        const { message_id, quality } = data;
        
        // Get message from store
        const msg = await getMessageById(message_id);
        if (!msg || !hasMedia(msg)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Message not found or has no media'
            }));
            return;
        }
        
        // Download media
        const mediaType = getMediaType(msg);
        const stream = await downloadContentFromMessage(
            msg.message[mediaType],
            mediaType
        );
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        // Generate filename
        const ext = getExtension(mediaType);
        const filename = `whatsapp_${message_id}_${Date.now()}.${ext}`;
        const filepath = path.join(__dirname, '../downloads', filename);
        
        // Save file
        fs.writeFileSync(filepath, buffer);
        
        ws.send(JSON.stringify({
            type: 'download_complete',
            data: {
                message_id,
                filename,
                filepath,
                size: buffer.length,
                type: mediaType
            }
        }));
        
    } catch (error) {
        console.error('Media download error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message
        }));
    }
}

async function handleStatusMessage(msg) {
    if (hasMedia(msg)) {
        const mediaType = getMediaType(msg);
        const stream = await downloadContentFromMessage(
            msg.message[mediaType],
            mediaType
        );
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        // Save status
        const ext = getExtension(mediaType);
        const filename = `whatsapp_status_${msg.key.id}_${Date.now()}.${ext}`;
        const filepath = path.join(__dirname, '../downloads/statuses', filename);
        
        fs.mkdirSync(path.join(__dirname, '../downloads/statuses'), { recursive: true });
        fs.writeFileSync(filepath, buffer);
        
        // Broadcast status
        broadcast({
            type: 'status_saved',
            data: {
                id: msg.key.id,
                from: msg.key.participant || msg.key.remoteJid,
                filename,
                filepath,
                type: mediaType,
                timestamp: msg.messageTimestamp
            }
        });
    }
}

async function handleViewOnceMessage(msg) {
    // Similar to status handling for view-once media
    const viewOnceMsg = msg.message.viewOnceMessage.message;
    if (viewOnceMsg.imageMessage || viewOnceMsg.videoMessage) {
        const mediaType = viewOnceMsg.imageMessage ? 'imageMessage' : 'videoMessage';
        const stream = await downloadContentFromMessage(
            viewOnceMsg[mediaType],
            mediaType.replace('Message', '')
        );
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const ext = viewOnceMsg.imageMessage ? 'jpg' : 'mp4';
        const filename = `whatsapp_viewonce_${msg.key.id}_${Date.now()}.${ext}`;
        const filepath = path.join(__dirname, '../downloads/viewonce', filename);
        
        fs.mkdirSync(path.join(__dirname, '../downloads/viewonce'), { recursive: true });
        fs.writeFileSync(filepath, buffer);
    }
}

function hasMedia(msg) {
    return !!(msg.message?.imageMessage ||
              msg.message?.videoMessage ||
              msg.message?.audioMessage ||
              msg.message?.documentMessage);
}

function getMediaType(msg) {
    if (msg.message?.imageMessage) return 'imageMessage';
    if (msg.message?.videoMessage) return 'videoMessage';
    if (msg.message?.audioMessage) return 'audioMessage';
    if (msg.message?.documentMessage) return 'documentMessage';
    return null;
}

function getExtension(mediaType) {
    const extensions = {
        'imageMessage': 'jpg',
        'videoMessage': 'mp4',
        'audioMessage': 'mp3',
        'documentMessage': 'pdf'
    };
    return extensions[mediaType] || 'bin';
}

function getMessageType(msg) {
    if (msg.message?.conversation) return 'text';
    if (hasMedia(msg)) return 'media';
    return 'unknown';
}

function broadcast(data) {
    const message = JSON.stringify(data);
    connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

server.listen(PORT, () => {
    console.log(`WhatsApp bridge running on port ${PORT}`);
});
"""