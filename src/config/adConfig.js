import { loadMonetagAfterDelay } from '@/utils/delayed-ads-loader';

// Monetag powers web ads. Native app ad unit IDs are kept for Capacitor builds.

export const adConfig = {
  // Android Ad Unit IDs
  android: {
    banner: {
      unitId: 'ca-app-pub-2390460896724446/3282382183',
      unitName: 'Banner - Bottom',
      type: 'banner',
      description: 'Banner ads displayed at the bottom of the downloader'
    },
    interstitial: {
      unitId: 'ca-app-pub-2390460896724446/5625668013',
      unitName: 'Interstitial - AfterSave',
      type: 'interstitial',
      description: 'Full screen ads shown after user saves a download'
    },
    rewarded: {
      unitId: 'ca-app-pub-2390460896724446/9213559236',
      unitName: 'Rewarded - UnlockPremium',
      type: 'rewarded',
      description: 'Rewarded video ads for unlocking premium features'
    },
    rewardedInterstitial: {
      unitId: 'ca-app-pub-2390460896724446/3045081919',
      unitName: 'Rewarded Interstitial',
      type: 'rewardedInterstitial',
      description: 'Rewarded interstitial ads for premium unlocks'
    }
  },
  
  // iOS Ad Unit IDs
  ios: {
    banner: {
      unitId: 'ca-app-pub-2390460896724446/8088179829',
      unitName: 'Banner - Bottom',
      type: 'banner',
      description: 'Banner ads displayed at the bottom of the downloader'
    },
    interstitial: {
      unitId: 'ca-app-pub-2390460896724446/5789319547',
      unitName: 'Interstitial - AfterSave',
      type: 'interstitial',
      description: 'Full screen ads shown after user saves a download'
    },
    rewarded: {
      unitId: 'ca-app-pub-2390460896724446/2835853148',
      unitName: 'Rewarded - UnlockPremium',
      type: 'rewarded',
      description: 'Rewarded video ads for unlocking premium features'
    },
    rewardedInterstitial: {
      unitId: 'ca-app-pub-2390460896724446/6792755235',
      unitName: 'Rewarded Interstitial',
      type: 'rewardedInterstitial',
      description: 'Rewarded interstitial ads for premium unlocks'
    }
  },

  // Test Ad Unit IDs (for development/testing)
  test: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917'
  }
};

// Detect platform (Android/iOS)
export const getPlatformAdConfig = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) {
    return adConfig.android;
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return adConfig.ios;
  } else {
    // Default to Android config for desktop/web testing
    return adConfig.android;
  }
};

// Initialize Monetag for web. Kept as initializeAdMob for older imports.
export const initializeAdMob = () => {
  if (typeof window !== 'undefined') {
    return loadMonetagAfterDelay();
  }

  return Promise.resolve(false);
};

// Display banner ad through Monetag on web.
export const displayBannerAd = (unitId) => {
  if (typeof window !== 'undefined') {
    return loadMonetagAfterDelay();
  }

  return Promise.resolve(false);
};

// Display interstitial ad through Monetag on web.
export const showInterstitialAd = async (unitId) => {
  try {
    return await loadMonetagAfterDelay();
  } catch (e) {
    console.log('Interstitial ad error:', e);
    return false;
  }
};

// Display rewarded ad through Monetag on web.
export const showRewardedAd = async (unitId) => {
  try {
    return await loadMonetagAfterDelay();
  } catch (e) {
    console.log('Rewarded ad error:', e);
    return false;
  }
};

export default adConfig;
