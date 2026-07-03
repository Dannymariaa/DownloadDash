# Ads Configuration

DownloadDash uses a single Monetag Vignette Banner for the website, PWA, and mobile web app:

```html
<script>
(function(s){
    s.dataset.zone='11129621';
    s.src='https://n6wxm.com/vignette.min.js';
})([document.documentElement,document.body]
.filter(Boolean)
.pop()
.appendChild(document.createElement('script')));
</script>
```

## Ad Zone Configuration

The application now uses a single, clean ad configuration:

### Primary Zone (Active)
- **Vignette Banner (11129621)**: `https://n6wxm.com/vignette.min.js` - Clean banner ad placement

## Runtime Files

- [src/Layout.jsx](src/Layout.jsx) - Loads Vignette script once on app initialization
- [mobile/app.json](mobile/app.json) - Mobile app ad configuration
- [mobile/utils/adsManager.js](mobile/utils/adsManager.js) - Mobile ad manager

## Current Configuration

- Provider: `monetag`
- Format: `vignette`
- Zone ID: 11129621
- Script: `https://n6wxm.com/vignette.min.js`
- Loading: Once from root Layout component only

## Environment Variables

Configure ad zone via environment variable (optional):

```bash
# Vignette Banner Zone
VITE_MONETAG_VIGNETTE_ZONE=11129621
VITE_MONETAG_VIGNETTE_SRC=https://n6wxm.com/vignette.min.js
```

## Design Notes

- Single script loaded once prevents duplicates and race conditions
- No popup timers, onclick redirects, or frequency logic
- No push notifications, direct links, or interstitials
- Clean banner display only
- Script loaded from root Layout component to ensure single initialization
2. **Audio Download Flow**: Unified with other download types (previously had special handling)
3. **Photo Album Handling**: Better detection and support for carousel/album downloads
4. **Audio Extraction**: Improved support for extracting audio from photo carousels
5. **Ad Zone Coverage**: Added 6 additional zones for better monetization

## Notes

- The app independently handles ad loading from download functionality
- All ad gates are non-blocking - users can cancel and retry
- Ad timers are clearly displayed to users
- Ads appear before file download begins, not during transfer

## Redeploy Checklist

1. ✅ Update [src/components/DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx) - Add 5s audio ads
2. ✅ Update [src/utils/delayed-ads-loader.js](src/utils/delayed-ads-loader.js) - Add new zones
3. Commit all changes to GitHub with message "Fix: Improve ad placement for all download types"
4. Redeploy Render API: `git push origin main` then trigger Render auto-deploy
5. Redeploy Vercel Web: `git push origin main` then trigger Vercel auto-deploy
6. Verify Monetag has approved all zones in the account dashboard
7. Test each download type to verify ads appear correctly:
   - HD Download → Should show 30s ad gate
   - SD Download → Should show 5s ad gate
   - Audio/MP3 → Should show 5s ad gate (NEW)
   - Photos → Should show 5s ad gate
   - Albums → Should show 5s ad gate before batch download
