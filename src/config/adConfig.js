// Google AdMob Configuration
// These are unit IDs for both Android and iOS

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

// Initialize Google Mobile Ads SDK
export const initializeAdMob = () => {
  if (typeof window !== 'undefined' && !window.adsbygoogle) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-app-pub-2390460896724446';
    script.onload = () => {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({
        google_ad_client: 'ca-app-pub-2390460896724446',
        enable_page_level_ads: true
      });
    };
    document.head.appendChild(script);
  }
};

// Display banner ad
export const displayBannerAd = (unitId) => {
  if (typeof window !== 'undefined' && window.adsbygoogle) {
    try {
      window.adsbygoogle.push({});
    } catch (e) {
      console.log('AdMob banner ad error:', e);
    }
  }
};

// Display interstitial ad
export const showInterstitialAd = async (unitId) => {
  return new Promise((resolve) => {
    try {
      if (typeof window !== 'undefined' && window.google && window.google.ima) {
        // Ad will be shown if available
        setTimeout(() => resolve(true), 2000);
      } else {
        // AdMob not ready
        resolve(false);
      }
    } catch (e) {
      console.log('Interstitial ad error:', e);
      resolve(false);
    }
  });
};

// Display rewarded ad
export const showRewardedAd = async (unitId) => {
  return new Promise((resolve) => {
    try {
      if (typeof window !== 'undefined' && window.google && window.google.ima) {
        // Rewarded ad shown
        setTimeout(() => resolve(true), 3000);
      } else {
        resolve(false);
      }
    } catch (e) {
      console.log('Rewarded ad error:', e);
      resolve(false);
    }
  });
};

export default adConfig;
