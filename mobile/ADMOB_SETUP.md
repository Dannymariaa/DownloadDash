# AdMob Integration Guide - DownloadDash Mobile

## Overview

This guide covers the complete AdMob integration for the DownloadDash mobile app (Android & iOS) using React Native and Expo.

## Configuration Details

### App Configuration
- **App ID**: `ca-app-pub-2390460896724446~4738934082`

### Android Ad Units

| Type | Purpose | Ad Unit ID |
|------|---------|-----------|
| Banner | Bottom of screen | `ca-app-pub-2390460896724446/3282382183` |
| Interstitial | After Save | `ca-app-pub-2390460896724446/5625668013` |
| Rewarded | Unlock Premium | `ca-app-pub-2390460896724446/9213559236` |

### iOS Ad Units

| Type | Purpose | Ad Unit ID |
|------|---------|-----------|
| Banner | Bottom of screen | `ca-app-pub-2390460896724446/8088179829` |
| Interstitial | After Save | `ca-app-pub-2390460896724446/5789319547` |
| Rewarded | Unlock Premium | `ca-app-pub-2390460896724446/2835853148` |

## Project Structure

```
mobile/
├── App.jsx                          # Main app component
├── app.json                         # Expo config with AdMob setup
├── package.json                     # Dependencies
├── index.js                         # Entry point
├── babel.config.js                  # Babel config
│
├── utils/
│   └── admobManager.js              # AdMob utility functions
│
├── components/
│   ├── BannerAd.jsx                 # Banner ad component
│   ├── InterstitialAd.jsx           # Interstitial ad component
│   └── RewardedAd.jsx               # Rewarded ad component
│
└── screens/
    └── AdDemoScreen.jsx             # Demo screen showing all ad types
```

## Utility Functions

### admobManager.js

**Available Functions:**

1. **initializeAdMob()**
   - Initializes AdMob with test device settings
   - Returns: boolean (success/failure)
   - Usage: `await initializeAdMob()`

2. **getAdUnitId(type, platform)**
   - Gets the ad unit ID for a specific ad type
   - Parameters:
     - `type`: 'banner' | 'interstitial' | 'rewarded'
     - `platform`: 'ios' | 'android' (auto-detected if not provided)
   - Returns: string (ad unit ID)
   - Usage: `const unitId = getAdUnitId('banner')`

3. **BannerAdManager**
   - `show(placement)` - Show banner ad
   - `hide()` - Hide banner ad

4. **InterstitialAdManager**
   - `requestAd()` - Request interstitial ad
   - `showAd()` - Show interstitial ad
   - `show()` - Request and show ad in one call

5. **RewardedAdManager**
   - `requestAd()` - Request rewarded ad
   - `showAd()` - Show rewarded ad and wait for reward
   - `show()` - Request and show ad in one call

## Using Ad Components

### Banner Ad

```jsx
import BannerAd from '../components/BannerAd';

export default function MyScreen() {
  return (
    <View>
      <Text>Content here</Text>
      <BannerAd placement="banner" />
    </View>
  );
}
```

### Interstitial Ad

```jsx
import InterstitialAd from '../components/InterstitialAd';

export default function MyScreen() {
  const handleDownloadComplete = () => {
    console.log('Download completed');
  };

  return (
    <View>
      <Text>Content here</Text>
      <InterstitialAd
        trigger="afterDownload"
        onComplete={handleDownloadComplete}
      />
    </View>
  );
}
```

### Rewarded Ad

```jsx
import RewardedAd from '../components/RewardedAd';

export default function MyScreen() {
  const handleReward = (reward) => {
    console.log('User earned:', reward);
    // Unlock premium feature
  };

  return (
    <View>
      <Text>Content here</Text>
      <RewardedAd feature="UnlockPremium" onReward={handleReward} />
    </View>
  );
}
```

## Direct Manager Usage

Instead of components, you can use the managers directly:

```jsx
import { InterstitialAdManager, RewardedAdManager } from '../utils/admobManager';

// Show interstitial ad after save
export const handleSave = async () => {
  // ... save logic ...
  await InterstitialAdManager.show();
};

// Show rewarded ad for premium features
export const unlockPremium = async () => {
  const reward = await RewardedAdManager.show();
  if (reward) {
    unlockPremiumFeatures();
  }
};
```

## Development & Testing

### Run on Android

```bash
npm run android
```

**Requirements:**
- Android SDK installed
- Android Emulator running or device connected
- Android Studio (recommended)

### Run on iOS

```bash
npm run ios
```

**Requirements:**
- macOS
- Xcode installed
- iOS Simulator or device

### Test Ads

All ad unit IDs are configured for test mode. Set test device ID:

```javascript
import * as Ads from 'expo-ads-admob';

await Ads.setTestDeviceIDAsync('EMULATOR'); // or device ID
```

## Building for Production

### Android Build

```bash
eas build --platform android
```

### iOS Build

```bash
eas build --platform ios
```

## Troubleshooting

### Ads Not Showing
1. Verify ad unit IDs in `app.json`
2. Check that AdMob is initialized
3. Ensure test device is correctly set
4. Check console logs for errors

### Build Errors
1. Clear cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall dependencies: `npm install --legacy-peer-deps`

### Platform-Specific Issues

**Android:**
- Ensure Google Play Services are installed on emulator
- Check that app is signed correctly

**iOS:**
- Verify bundle ID in Xcode
- Check provisioning profiles

## Best Practices

1. **Test Thoroughly**
   - Test on real devices before production
   - Verify all ad types are working
   - Monitor ad performance

2. **User Experience**
   - Don't show ads too frequently
   - Show interstitial ads at natural breakpoints
   - Reward users for watching rewarded ads

3. **Privacy**
   - Include privacy policy
   - Follow GDPR/CCPA requirements
   - Respect user ad preferences

## References

- [Expo AdMob Documentation](https://docs.expo.dev/versions/latest/sdk/admob/)
- [Google AdMob Help Center](https://support.google.com/admob/)
- [React Native Documentation](https://reactnative.dev/)
