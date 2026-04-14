# DownloadDash Mobile

React Native mobile app for iOS and Android using Expo with AdMob integration.

## Setup

### Install Dependencies

```bash
cd mobile
npm install
```

### Configure AdMob

Your AdMob configuration is stored in `app.json`:
- **App ID**: ca-app-pub-2390460896724446~4738934082

#### Android Ad Units
- **Banner (Bottom)**: ca-app-pub-2390460896724446/3282382183
- **Interstitial (After Save)**: ca-app-pub-2390460896724446/5625668013
- **Rewarded (Unlock Premium)**: ca-app-pub-2390460896724446/9213559236

#### iOS Ad Units
- **Banner (Bottom)**: ca-app-pub-2390460896724446/8088179829
- **Interstitial (After Save)**: ca-app-pub-2390460896724446/5789319547
- **Rewarded (Unlock Premium)**: ca-app-pub-2390460896724446/2835853148

## Running the App

### Start Development Server
```bash
npm start
```

### Android
```bash
npm run android
```
(Requires Android Emulator or connected Android device)

### iOS
```bash
npm run ios
```
(Requires macOS and Xcode)

### Web
```bash
npm run web
```

## Project Structure

```
mobile/
├── App.jsx              # Main app component with AdMob setup
├── app.json             # Expo configuration with AdMob ad units
├── package.json         # Dependencies
├── babel.config.js      # Babel configuration
└── index.js             # Entry point
```

## AdMob Integration

The app uses `expo-ads-admob` for displaying ads. Ad unit IDs are stored in `app.json` and can be accessed via:

```javascript
import Constants from 'expo-constants';
const admobConfig = Constants.expoConfig?.extra?.admob;
```

## Next Steps

1. Install dependencies: `npm install`
2. Configure native modules for Android/iOS (may require additional setup)
3. Build and run on emulators or devices
4. Implement banner, interstitial, and rewarded ads in components
