# Google AdMob Configuration

This document outlines how the Google AdMob ads are integrated into DownloadDash.

## Current Ad Unit IDs

### Android (Active)
- **Banner (Bottom)**: `ca-app-pub-2390460896724446/3282382183`
  - Location: Bottom of all downloader pages
  - Type: Horizontal banner
  - Placement: After download options

- **Interstitial (After Save)**: `ca-app-pub-2390460896724446/5625668013`
  - Location: Shown after user saves content to collection
  - Type: Full-screen interstitial
  - Trigger: When user clicks "Save to Collection"

- **Rewarded (Unlock Premium)**: `ca-app-pub-2390460896724446/9213559236`
  - Location: Future premium features
  - Type: Rewarded video
  - Trigger: When user wants to unlock premium features

### iOS (Needs Configuration)
To add iOS ad unit IDs, update [src/config/adConfig.js](src/config/adConfig.js) and replace the test IDs in the `ios` object with your actual iOS unit IDs from Google AdMob.

## How Ads Are Displayed

### 1. Banner Ads
- **File**: [src/components/GoogleAdBanner.jsx](src/components/GoogleAdBanner.jsx)
- **Integration**: Used at top and bottom of [src/components/DownloaderTemplate.jsx](src/components/DownloaderTemplate.jsx)
- **Display**: Continuous horizontal banner ads

### 2. Interstitial Ads
- **Trigger**: After user saves content
- **Implementation**: Called in `handleSave()` function
- **Delay**: 500ms after save confirmation

### 3. Rewarded Ads
- **Trigger**: Every 2-3 downloads (video ad overlay)
- **Implementation**: In `VideoAdOverlay` component
- **Benefit**: Unlock premium download features

## Configuration File

Location: [src/config/adConfig.js](src/config/adConfig.js)

Functions available:
- `getPlatformAdConfig()` - Returns Android or iOS config based on device
- `initializeAdMob()` - Initializes Google Mobile Ads SDK
- `displayBannerAd(unitId)` - Shows a banner ad
- `showInterstitialAd(unitId)` - Shows an interstitial ad
- `showRewardedAd(unitId)` - Shows a rewarded ad

## How to Update Ad Unit IDs

1. Open [src/config/adConfig.js](src/config/adConfig.js)
2. Locate the `adConfig` object
3. Update the respective platform's unit IDs:

```javascript
export const adConfig = {
  android: {
    banner: {
      unitId: 'YOUR_ANDROID_BANNER_ID',
      // ...
    },
    // ... other android units
  },
  ios: {
    banner: {
      unitId: 'YOUR_IOS_BANNER_ID',
      // ...
    },
    // ... other ios units
  }
};
```

4. Save the file
5. Test ads on respective platforms

## Testing Ads

To test ad serving:
1. Use test device IDs in AdMob console
2. Or use the test unit IDs (already included for development)
3. Check browser console for any ad-loading errors

## Important Notes

- Ads are platform-aware (auto-detects Android vs iOS)
- Currently configured for Android production IDs
- iOS unit IDs are placeholders and need to be updated
- Ads load asynchronously and won't break the app if AdMob is unavailable
- Download functionality works independently of ads

## Revenue Optimization

Current placement:
- **Banner**: High-visibility positions (top + bottom of downloader pages)
- **Interstitial**: After user action (saving content) - good engagement point
- **Rewarded**: Encourages app usage for premium features

Additional opportunities:
- Add rewarded ads for power downloads
- Place interstitials between platform selections
- Add more banner ads on dashboard and home pages
