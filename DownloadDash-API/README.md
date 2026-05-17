![DownloadDash API](./assets/downloaddash-api-logo.png)

# DownloadDash API (Local Dev)

## Start (Windows / PowerShell)

```powershell
npm run setup
npm run dev
```

If PowerShell blocks `npm` with an execution policy error, use:

```powershell
npm.cmd run setup
npm.cmd run dev
```

Open:

- API root: `http://127.0.0.1:8000/`
- API docs: `http://127.0.0.1:8000/docs`
- Platform status summary: `http://127.0.0.1:8000/status`

Note: WhatsApp bridge is disabled by default in `npm run dev`.

Troubleshoot:

```powershell
npm run doctor
```

## Production proxy and domain

For hosted API deployments, set this environment variable on Render:

```text
SMD_OUTBOUND_PROXY=http://USERNAME:PASSWORD@HOST:PORT
```

`SMD_OUTBOUND_PROXY` is used by both yt-dlp and the direct HTTP fallback paths. If you only want to proxy YouTube fallback attempts, use `SMD_YTDLP_PROXY_YOUTUBE` instead.

The frontend is already configured to call:

```text
VITE_SMD_API_BASE_URL=https://api.downloaddash.store
```

Live API docs:

```text
https://api.downloaddash.store/docs
```

That API host should point to the Render web service custom domain. After changing Render environment variables, redeploy or restart the API service so the new proxy setting is loaded.

More details: `DownnloadDash-API/README.md`
