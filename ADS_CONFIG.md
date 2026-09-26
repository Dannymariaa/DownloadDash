# Ads Configuration

DownloadDash uses **Adsterra responsive/native banner ads** and a scheduler-controlled **Monetag MultiTag** integration. Interruptive ads must go through `src/lib/adScheduler.js`; do not add direct timers, route-change triggers, direct-link redirects, or independent popunder scripts.

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
- [src/App.jsx](src/App.jsx) - Root app wiring for Monetag initializer and mobile sticky Adsterra
- [src/lib/adScheduler.js](src/lib/adScheduler.js) - Global interruptive ad scheduler, cooldowns, redirect guard, and URL validator
- [src/lib/adManager.js](src/lib/adManager.js) - Provider script loader and scheduler integration
- [src/components/AdBanner.jsx](src/components/AdBanner.jsx) - Responsive banner wrapper
- [src/components/HDVideoAdModal.jsx](src/components/HDVideoAdModal.jsx) - HD video unlock modal with native ad
- [src/components/Ads/MonetagInitializer.jsx](src/components/Ads/MonetagInitializer.jsx) - One-time scheduler-controlled Monetag trigger
- [mobile/app.json](mobile/app.json) - Mobile app ad configuration
- [mobile/utils/adsManager.js](mobile/utils/adsManager.js) - Mobile ad manager

## Current Configuration

- Provider: `adsterra`
- Provider: `monetag`
- Format: Responsive iframe + Native
- Units: 4 (320x50, 728x90, 300x250, Native)
- Loading: Per-component, on-demand
- Duplicate Prevention: Container-based script marker checking
- Global interruptive cooldown: 2 minutes
- Monetag MultiTag cooldown: 5 minutes
- DownloadDash-controlled redirect/popunder/direct-link attempts: max 1 per full page load
- SPA navigation does not reset redirect/popunder/direct-link allowance

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
- **Scheduling**: Interruptive ads use `src/lib/adScheduler.js`; excessive triggers are discarded rather than queued
- **Download Gates**: One eligible ad event per download action, then the selected download continues
- **Client URL Safety**: DownloadDash-controlled ad destination URLs must be valid `http:` or `https:` and must not match configured adult denylist domains

## Adult / Pornography Safety

Client code validates ad destinations only when DownloadDash itself receives or controls the URL before navigation. Third-party provider scripts can choose or redirect to a final destination internally, so adult/pornographic inventory must be disabled in each provider dashboard.

MANUAL DASHBOARD ACTION REQUIRED:

- Monetag: keep this property/zone in mainstream-only inventory. Disable or remove SmartLink/direct-link, popunder, push/social/in-page push, and adult/non-mainstream campaign categories. Confirm zone `246109` and MultiTag formats do not serve adult, erotic, adult dating, cam, or explicit-video campaigns.
- Adsterra: for each website/ad unit zone, keep traffic/category mainstream and do not enable "accept all ads" / Boost CPM-style settings for sensitive traffic. Disable adult/erotic, adult dating/cam, explicit, popunder, Social Bar/push, Smartlink/direct-link, malware/scareware, gambling, and crypto if inappropriate for the audience.

Do not claim pornography blocking is complete until these provider-side restrictions are enabled and verified in the dashboards. Frontend denylisting is defense in depth, not the primary safety control.

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

- Removed route-change Monetag triggers
- Added centralized scheduler for interruptive ads
- Added 2-minute global interruptive cooldown
- Added 5-minute Monetag MultiTag cooldown
- Added one redirect/popunder/direct-link attempt guard per full page load for DownloadDash-controlled navigations
- Reduced HD download gate to one Adsterra native banner placement
- Added client destination validation for DownloadDash-controlled ad URLs
- Removed unused mobile direct opening of provider script URLs
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
