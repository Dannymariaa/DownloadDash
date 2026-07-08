# DownloadDash TikTok API

## Overview
Resolve public TikTok media and metadata for download workflows.

## Features
- Resolve public TikTok video links
- Return media metadata
- Support quality and audio extraction options

## Endpoints
- `POST /tiktok/download`

## Request Example
```json
{
  "url": "https://www.tiktok.com/@creator/video/1234567890123456789",
  "quality": "high",
  "extract_audio": false,
  "include_metadata": true
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
Free plan for testing, Basic for low volume, Pro for production, Enterprise by request.
