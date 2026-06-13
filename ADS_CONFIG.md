# Ads Configuration

DownloadDash uses the Monetag Multitag provider for the website, PWA, and mobile web app:

```html
<script src="https://3nbf4.com/88/tag.min.js" data-zone="11099484" async data-cfasync="false"></script>
```

## Ad Zones Configuration

The application now supports 12 ad zones for improved coverage and revenue optimization:

### Primary Zones (Configured)
- **In-Page Push (11129612)**: `https://nap5k.com/tag.min.js` - Primary placement for download screens
- **Vignette Banner (11129621)**: `https://n6wxm.com/vignette.min.js` - Rewarded ad placement
- **OnClick Popunder (11133067)**: `https://al5sm.com/tag.min.js` - Background popunder ads
- **Direct Link**: `https://omg10.com/4/11129628` - Direct engagement link

### Additional Zones (New)
- **Zone 1 (246643)**: `https://quge5.com/88/tag.min.js` - Additional coverage
- **Zone 2 (246109)**: `https://quge5.com/88/tag.min.js` - Backup coverage

## Ad Placement By Download Type

- **HD Download**: 30s rewarded ad + "Claim Award" button before download starts
- **SD Download**: 5s quick ad before download starts  
- **Audio/MP3**: 5s quick ad before download starts (NEW - changed from 0s)
- **Photo/Image**: 5s quick ad before download starts
- **Album/Carousel**: 5s quick ad before batch download starts

## Runtime Files

- [src/utils/delayed-ads-loader.js](src/utils/delayed-ads-loader.js) - Ad provider script loading with zone support
- [src/config/adConfig.js](src/config/adConfig.js) - Zone configuration (if exists)
- [src/components/AdBanner.jsx](src/components/AdBanner.jsx) - Ad display component
- [src/components/DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx) - Download UI with integrated ad gates
- [mobile/app.json](mobile/app.json) - Mobile app ad configuration
- [mobile/utils/adsManager.js](mobile/utils/adsManager.js) - Mobile ad manager

## Current Configuration

- Provider: `monetag`
- Format: `multitag`
- Primary Zone IDs: 11099484, 11129612, 11129621, 11133067, 11129628, 246643, 246109
- All zones use `data-cfasync="false"` for compatibility

## Environment Variables

Configure ad zones via environment variables:

```bash
# In-Page Push
VITE_MONETAG_IN_PAGE_PUSH_ZONE=11129612
VITE_MONETAG_IN_PAGE_PUSH_SRC=https://nap5k.com/tag.min.js

# Vignette Banner
VITE_MONETAG_VIGNETTE_ZONE=11129621
VITE_MONETAG_VIGNETTE_SRC=https://n6wxm.com/vignette.min.js

# OnClick Popunder
VITE_MONETAG_ONCLICK_ZONE=11133067
VITE_MONETAG_ONCLICK_SRC=https://al5sm.com/tag.min.js

# Direct Link
VITE_MONETAG_DIRECT_LINK=https://omg10.com/4/11129628

# Additional Zones
VITE_MONETAG_ZONE1_ID=246643
VITE_MONETAG_ZONE1_SRC=https://quge5.com/88/tag.min.js

VITE_MONETAG_ZONE2_ID=246109
VITE_MONETAG_ZONE2_SRC=https://quge5.com/88/tag.min.js

# Zone ID List (comma-separated for fallback)
VITE_AD_PROVIDER_ZONE_IDS=11129612,11129621,11133067,246643,246109
```

## Key Fixes in This Update

1. **Audio/MP3 Ad Gate**: Now shows 5s ad before download (was 0s)
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
