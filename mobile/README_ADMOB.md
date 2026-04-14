# DownloadDash Mobile

React Native mobile app for iOS and Android using Expo with AdMob integration.

## ✨ Features

- ✅ iOS & Android support via Expo
- ✅ AdMob integration (Banner, Interstitial, Rewarded ads)
- ✅ Cross-platform ad management
- ✅ Test ad units configured and ready
- ✅ Reusable ad components

## 📦 Setup

### 1. Install Dependencies

```bash
cd mobile
npm install --legacy-peer-deps
```

- **Node version**: 16+ recommended
- **Expo CLI**: Installed as a dependency

### 2. AdMob Configuration

All AdMob settings are pre-configured in `app.json`:

- **App ID**: `ca-app-pub-2390460896724446~4738934082`
- **Android Ad Units**: 3 configured (Banner, Interstitial, Rewarded)
- **iOS Ad Units**: 3 configured (Banner, Interstitial, Rewarded)

See [ADMOB_SETUP.md](./ADMOB_SETUP.md) for detailed configuration.

## 🚀 Running the App

### Start Development Server

```bash
npm start
```

Then choose your platform:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web preview

### Android

```bash
npm run android
```

**Requirements:**
- Android SDK
- Android Emulator or connected device

### iOS

```bash
npm run ios
```

**Requirements:**
- macOS
- Xcode

### Web (Preview Only)

```bash
npm run web
```

## 📁 Project Structure

```
mobile/
├── App.jsx                  # Main app component
├── app.json                 # Expo config with AdMob setup
├── package.json             # Dependencies
├── index.js                 # Entry point
├── babel.config.js          # Babel configuration
├── ADMOB_SETUP.md          # Detailed AdMob guide
│
├── utils/
│   └── admobManager.js      # AdMob utility functions and managers
│
├── components/
│   ├── BannerAd.jsx         # Banner ad component (reusable)
│   ├── InterstitialAd.jsx   # Interstitial ad component (reusable)
│   └── RewardedAd.jsx       # Rewarded ad component (reusable)
│
└── screens/
    └── AdDemoScreen.jsx     # Demo screen with all ad types
```

## 🎯 Ad Types

### Banner Ads
- **Location**: Bottom of screen
- **Android ID**: `ca-app-pub-2390460896724446/3282382183`
- **iOS ID**: `ca-app-pub-2390460896724446/8088179829`
- **Size**: 320x50 dp
- **Usage**: Display throughout app for passive ad revenue

### Interstitial Ads
- **Type**: Full-screen ads
- **Trigger**: After user saves content
- **Android ID**: `ca-app-pub-2390460896724446/5625668013`
- **iOS ID**: `ca-app-pub-2390460896724446/5789319547`
- **Usage**: Show between content interactions

### Rewarded Ads
- **Type**: User-opted video ads
- **Trigger**: Premium feature unlock
- **Android ID**: `ca-app-pub-2390460896724446/9213559236`
- **iOS ID**: `ca-app-pub-2390460896724446/2835853148`
- **Reward**: Points/Premium features

## 💻 Component Usage Examples

### Using Banner Ad

```jsx
import BannerAd from '../components/BannerAd';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Welcome to DownloadDash</Text>
      <BannerAd placement="bottom" />
    </View>
  );
}
```

### Using Interstitial Ad

```jsx
import InterstitialAd from '../components/InterstitialAd';

export default function DownloadScreen() {
  return (
    <View>
      {/* Download UI */}
      <InterstitialAd trigger="afterSave" />
    </View>
  );
}
```

### Using Rewarded Ad

```jsx
import RewardedAd from '../components/RewardedAd';

const handleReward = (reward) => {
  console.log('Earned:', reward.amount, reward.type);
};

export default function PremiumScreen() {
  return (
    <RewardedAd feature="UnlockPremium" onReward={handleReward} />
  );
}
```

## 🔧 Utility Functions

### admobManager.js

```javascript
import {
  initializeAdMob,
  getAdUnitId,
  BannerAdManager,
  InterstitialAdManager,
  RewardedAdManager
} from './utils/admobManager';

// Initialize AdMob
await initializeAdMob();

// Get ad unit ID
const unitId = getAdUnitId('banner'); // platform auto-detected

// Show ads programmatically
await InterstitialAdManager.show();
const reward = await RewardedAdManager.show();
```

## 📋 Development Checklist

- [x] Expo project setup
- [x] AdMob configuration (app.json)
- [x] Ad utility manager created
- [x] Banner ad component
- [x] Interstitial ad component
- [x] Rewarded ad component
- [x] Demo screen with all ad types
- [x] Documentation
- [ ] Build for Android
- [ ] Build for iOS
- [ ] Test on real devices
- [ ] Deploy to app stores

## 🔨 Build for Production

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

Requires Expo credentials and EAS account.

## 🐛 Troubleshooting

### Dependency Issues
```bash
npm cache clean --force
rm -rf node_modules
npm install --legacy-peer-deps
```

### Platform-Specific
- **Android**: Ensure SDK and emulator are installed
- **iOS**: Ensure Xcode and command-line tools are installed

### Ad Issues
- Check ad unit IDs in `app.json`
- Verify test device settings
- Check console logs for errors
- Ensure AdMob is initialized before showing ads

## 📚 Documentation

- [Detailed AdMob Setup](./ADMOB_SETUP.md)
- [Expo Documentation](https://docs.expo.dev/)
- [Google AdMob Help](https://support.google.com/admob/)
- [React Native Docs](https://reactnative.dev/)

## 📄 License

Same as main DownloadDash project

## 🚀 Next Steps

1. **Configure your AdMob account**:
   - Log in at [AdMob Console](https://admob.google.com/)
   - Verify app setup
   - Enable live ad serving when ready

2. **Test on devices**:
   - Build Android APK/AAB
   - Build iOS IPA
   - Test on real devices

3. **Deploy to stores**:
   - Google Play Store (Android)
   - Apple App Store (iOS)

## 📞 Support

For AdMob issues, visit [Google AdMob Help](https://support.google.com/admob/)
For Expo issues, visit [Expo Documentation](https://docs.expo.dev/)
