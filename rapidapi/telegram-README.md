# DownloadDash Telegram API

## Overview
Resolve public Telegram message and channel media for download workflows.

## Features
- Resolve public Telegram message media
- Return image, video, or audio details
- Support metadata and quality options

## Endpoints
- `POST /telegram/download`

## Request Example
```json
{
  "url": "https://t.me/examplechannel/123",
  "platform": "telegram",
  "quality": "high",
  "include_metadata": true,
  "download_thumbnails": false,
  "extract_audio": false
}
```

## Response Example
```json
{
  "success": true,
  "message": "Media resolved successfully",
  "download_id": "b4b5f3b8-6bdb-4e1e-9ad2-0e9b52f7a5b1",
  "status": "completed",
  "media_info": {
    "id": "b4b5f3b8-6bdb-4e1e-9ad2-0e9b52f7a5b1",
    "platform": "youtube",
    "media_type": "video",
    "url": "https://example.com/public-media",
    "title": "Public media",
    "thumbnail_url": "https://example.com/thumbnail.jpg",
    "download_url": "https://cdn.example.com/media.mp4",
    "file_format": "mp4"
  },
  "download_url": "https://cdn.example.com/media.mp4",
  "downloads": {
    "videoHD": "https://cdn.example.com/media-hd.mp4"
  },
  "warnings": []
}
```

## Error Codes
- `400`: Invalid request input.
- `401`: Missing or invalid API key where required.
- `404`: Requested job or file was not found.
- `422`: Validation error for request body, query, or path parameters.
- `429`: Rate limit exceeded.
- `502`: Upstream platform resolver failed or source media was unavailable.

## Authentication
Send requests through RapidAPI with your RapidAPI application key. No direct origin API key is required by this OpenAPI document.

## Rate Limit Recommendations
Start with a conservative public plan such as 60 requests per minute and 1,000 requests per day. Increase limits for paid plans only after monitoring upstream resolver reliability and abuse patterns.

## Pricing Suggestions
Free testing tier, then Pro and Business tiers for production traffic.
