# DownloadDash App

DownloadDash is scoped to supported publicly accessible media links: posts, videos, stories, galleries, and similar public URLs that a normal user can view without special access. When a supported public link is viewable, DownloadDash should attempt to resolve and return all actual media items exposed by that link. It must not be used to bypass private, login-only, paid, deleted, DRM-protected, or otherwise restricted content.

## Setup Instructions

1. Install dependencies:
`ash
npm install
``n
2. Add your API key to `.env.local` for local Vercel/API development:
```bash
DOWNLOADDASH_API_KEY=
```

For Vercel deployments, create the same `DOWNLOADDASH_API_KEY` variable in the Vercel project environment. Configure Production for the live site, and Preview/Development for deployments that should use the downloader.
3. Run the development server:
```bash
npm run dev
```
## API Routes

- /api/smd/youtube/download - YouTube downloads
- /api/smd/instagram/download - Instagram downloads
- /api/smd/tiktok/download - TikTok downloads
- /api/smd/facebook/download - Facebook downloads
- /api/smd/pinterest/download - Pinterest downloads
- /api/smd/reddit/download - Reddit downloads
- /api/smd/x/download - X/Twitter downloads
