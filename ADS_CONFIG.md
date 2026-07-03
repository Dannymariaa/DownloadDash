# Ads Configuration

DownloadDash now uses **Adsterra responsive banner ads** with responsive sizing and native ad support for HD video unlock feature.

## Ad Units Configuration

The application uses four Adsterra ad units with responsive design:

### Primary Units (Active)

1. **Native Banner (30079457)** - HD Video Unlock Popup
   - Format: Native
   - Usage: Shows in modal when user tries to download HD video
   - Component: [src/components/HDVideoAdModal.jsx](src/components/HDVideoAdModal.jsx)
   - Script: `https://pl30179956.effectivecpmnetwork.com/deb9ee3e2f39503eb7a9d1619e78739f/invoke.js`

2. **Banner 320x50 (30079458)** - Mobile
   - Format: Responsive iframe
   - Breakpoint: Mobile devices (<768px)
   - Dimensions: 320x50 pixels
   - Component: [src/components/AdBanner.jsx](src/components/AdBanner.jsx)
   - Script: `https://www.highperformanceformat.com/25fdf0e506fec8285d21a27d4bc83eb2/invoke.js`

3. **Banner 728x90 (30079459)** - Desktop/Tablet
   - Format: Responsive iframe
   - Breakpoint: Desktop/Tablet (≥768px)
   - Dimensions: 728x90 pixels
   - Component: [src/components/AdBanner.jsx](src/components/AdBanner.jsx)
   - Script: `https://www.highperformanceformat.com/630c6c9a5f2b0f771022aff6e8e18ca7/invoke.js`

4. **Banner 300x250 (30079460)** - Optional Bottom Placement
   - Format: Responsive iframe
   - Dimensions: 300x250 pixels (medium rectangle)
   - Component: [src/components/AdBanner.jsx](src/components/AdBanner.jsx)
   - Script: `https://www.highperformanceformat.com/25fdf0e506fec8285d21a27d4bc83eb2/invoke.js`

## Runtime Files

- [src/config/adsterraConfig.js](src/config/adsterraConfig.js) - Central Adsterra configuration and helpers
- [src/Layout.jsx](src/Layout.jsx) - Root layout (no global ad loading, ads loaded per-component)
- [src/components/AdBanner.jsx](src/components/AdBanner.jsx) - Responsive banner wrapper
- [src/components/HDVideoAdModal.jsx](src/components/HDVideoAdModal.jsx) - HD video unlock modal with native ad
- [mobile/app.json](mobile/app.json) - Mobile app ad configuration
- [mobile/utils/adsManager.js](mobile/utils/adsManager.js) - Mobile ad manager

## Current Configuration

- Provider: `adsterra`
- Format: Responsive iframe + Native
- Units: 4 (320x50, 728x90, 300x250, Native)
- Loading: Per-component, on-demand
- Duplicate Prevention: Container-based script marker checking

## Ad Placements

### Web Application

1. **Between Input and Results** - AdBanner (middle, medium)
   - Location: [DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx#L628)
   - Size: 728x90 (desktop) or 320x50 (mobile)

2. **Between Results and Features** - AdBanner (middle, large)
   - Location: [DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx#L854)
   - Size: 728x90 (desktop) or 320x50 (mobile)

3. **Bottom Section - Large** - AdBanner (bottom, large)
   - Location: [DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx#L1009)
   - Size: 728x90 (desktop) or 320x50 (mobile)

4. **Bottom Section - Medium** - AdBanner (bottom, medium)
   - Location: [DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx#L1012)
   - Size: 728x90 (desktop) or 320x50 (mobile)

### HD Video Unlock Modal

- **Native Banner** - HDVideoAdModal
- Location: Triggered on HD video download request
- Format: Native advertisement with 8-second countdown
- Component: [src/components/HDVideoAdModal.jsx](src/components/HDVideoAdModal.jsx)

## Environment Variables

Configure ad units via environment variables (optional):

```bash
# Adsterra Native Banner
VITE_ADSTERRA_NATIVE_BANNER_ID=30079457
VITE_ADSTERRA_NATIVE_BANNER_KEY=c1a1efe79c0f2963e83460ce138fae10

# Adsterra Responsive Banners
VITE_ADSTERRA_BANNER_320x50_ID=30079458
VITE_ADSTERRA_BANNER_320x50_KEY=25fdf0e506fec8285d21a27d4bc83eb2

VITE_ADSTERRA_BANNER_728x90_ID=30079459
VITE_ADSTERRA_BANNER_728x90_KEY=630c6c9a5f2b0f771022aff6e8e18ca7

VITE_ADSTERRA_BANNER_300x250_ID=30079460
VITE_ADSTERRA_BANNER_300x250_KEY=25fdf0e506fec8285d21a27d4bc83eb2
```

## Design Notes

- **Responsive Design**: Automatically selects 320x50 (mobile) or 728x90 (desktop) based on viewport width
- **Duplicate Prevention**: Each container uses a unique marker to prevent duplicate script loads on React rerenders
- **Native App Support**: Returns placeholder divs in native mobile app mode (localStorage NATIVE_APP flag)
- **On-Demand Loading**: Scripts load only when AdBanner component renders
- **HD Video Gate**: Native banner shown in modal before HD download is granted
- **Performance**: No blocking scripts, all ads load asynchronously

## Mobile Configuration

Mobile app configuration is in [mobile/app.json](mobile/app.json#L29):

```json
"ads": {
  "provider": "adsterra",
  "units": {
    "nativeBanner": { "id": "30079457", ... },
    "banner320x50": { "id": "30079458", ... },
    "banner728x90": { "id": "30079459", ... },
    "banner300x250": { "id": "30079460", ... }
  }
}
```

## Debugging

Check if ads are loading correctly:

1. Open DevTools Console
2. Look for Adsterra script tags with data-container attribute
3. Check for errors in Network tab (ads.highperformanceformat.com)
4. Verify container IDs match in HTML

## Migration Notes

- Removed: Monetag Vignette (zone 11129621)
- Added: Adsterra responsive banners
- Updated: Component structure for on-demand ad loading
- Added: HD video unlock modal with native banner support
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
