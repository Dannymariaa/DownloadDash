# Social Media Downloader (Local Dev)

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

More details: `social-media-downloader-api/README.md`
