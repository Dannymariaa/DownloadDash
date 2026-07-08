# DownloadDash Gallery API

## Overview
Resolve and manage gallery-dl jobs for public image, video, audio, story, and status URLs.

## Features
- Resolve public galleries without downloading files
- Start gallery download jobs
- Fetch job status and downloaded files

## Endpoints
- `POST /gallery/resolve`
- `POST /gallery/download`
- `GET /gallery/jobs/{job_id}`
- `GET /gallery/file/{job_id}/{filename}`

## Request Example
```json
{
  "url": "https://www.example.com/gallery/public-post",
  "limit": 25
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
Send requests through RapidAPI with your RapidAPI application key. Gallery endpoints also preserve the backend `X-API-Key` security scheme when used directly against the origin.

## Rate Limit Recommendations
Start with a conservative public plan such as 60 requests per minute and 1,000 requests per day. Increase limits for paid plans only after monitoring upstream resolver reliability and abuse patterns.

## Pricing Suggestions
Free testing tier, then usage-based pricing with higher tiers for job and file workflows.
