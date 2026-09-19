# DownloadDash App

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
