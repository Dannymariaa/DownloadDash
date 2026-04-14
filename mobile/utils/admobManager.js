import * as Ads from 'expo-ads-admob';
import Constants from 'expo-constants';

const admobConfig = Constants.expoConfig?.extra?.admob;

// Get ad unit ID based on platform and type
export const getAdUnitId = (type, platform = null) => {
  const currentPlatform = platform || (require('react-native').Platform.OS === 'ios' ? 'ios' : 'android');
  
  const androidUnits = {
    banner: admobConfig?.android?.bannerBottom,
    interstitial: admobConfig?.android?.interstitialAfterSave,
    rewarded: admobConfig?.android?.rewardedUnlockPremium,
    rewardedInterstitial: admobConfig?.android?.rewardedInterstitial,
  };

  const iosUnits = {
    banner: admobConfig?.ios?.bannerBottom,
    interstitial: admobConfig?.ios?.interstitialAfterSave,
    rewarded: admobConfig?.ios?.rewardedUnlockPremium,
    rewardedInterstitial: admobConfig?.ios?.rewardedInterstitial,
  };

  const units = currentPlatform === 'ios' ? iosUnits : androidUnits;
  return units[type] || null;
};

// Initialize AdMob
export const initializeAdMob = async () => {
  try {
    await Ads.setTestDeviceIDAsync('EMULATOR');
    console.log('AdMob initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
    return false;
  }
};

// Banner Ad Manager
export const BannerAdManager = {
  async show(placement = 'banner') {
    try {
      const adUnitId = getAdUnitId('banner');
      if (!adUnitId) {
        console.warn('Banner ad unit ID not configured');
        return;
      }

      await Ads.BannerAdManager.showBannerAdAsync(adUnitId);
      console.log('Banner ad displayed');
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  },

  async hide() {
    try {
      await Ads.BannerAdManager.removeBannerAdAsync();
      console.log('Banner ad hidden');
    } catch (error) {
      console.error('Failed to hide banner ad:', error);
    }
  },
};

// Interstitial Ad Manager
export const InterstitialAdManager = {
  async requestAd() {
    try {
      const adUnitId = getAdUnitId('interstitial');
      if (!adUnitId) {
        console.warn('Interstitial ad unit ID not configured');
        return false;
      }

      await Ads.InterstitialAdManager.requestAdAsync(adUnitId);
      console.log('Interstitial ad requested');
      return true;
    } catch (error) {
      console.error('Failed to request interstitial ad:', error);
      return false;
    }
  },

  async showAd() {
    try {
      await Ads.InterstitialAdManager.showAdAsync();
      console.log('Interstitial ad displayed');
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  },

  async show() {
    const requested = await this.requestAd();
    if (requested) {
      await this.showAd();
    }
  },
};

// Rewarded Ad Manager
export const RewardedAdManager = {
  async requestAd() {
    try {
      const adUnitId = getAdUnitId('rewarded');
      if (!adUnitId) {
        console.warn('Rewarded ad unit ID not configured');
        return false;
      }

      await Ads.RewardedAdManager.requestAdAsync(adUnitId);
      console.log('Rewarded ad requested');
      return true;
    } catch (error) {
      console.error('Failed to request rewarded ad:', error);
      return false;
    }
  },

  async showAd() {
    try {
      const reward = await Ads.RewardedAdManager.showAdAsync();
      console.log('Rewarded ad displayed, reward:', reward);
      return reward;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return null;
    }
  },

  async show() {
    const requested = await this.requestAd();
    if (requested) {
      return await this.showAd();
    }
    return null;
  },
};

// Rewarded Interstitial Ad Manager
export const RewardedInterstitialAdManager = {
  async requestAd() {
    try {
      const adUnitId = getAdUnitId('rewardedInterstitial');
      if (!adUnitId) {
        console.warn('Rewarded interstitial ad unit ID not configured');
        return false;
      }

      await Ads.RewardedInterstitialAdManager.requestAdAsync(adUnitId);
      console.log('Rewarded interstitial ad requested');
      return true;
    } catch (error) {
      console.error('Failed to request rewarded interstitial ad:', error);
      return false;
    }
  },

  async showAd() {
    try {
      const reward = await Ads.RewardedInterstitialAdManager.showAdAsync();
      console.log('Rewarded interstitial ad displayed, reward:', reward);
      return reward;
    } catch (error) {
      console.error('Failed to show rewarded interstitial ad:', error);
      return null;
    }
  },

  async show() {
    const requested = await this.requestAd();
    if (requested) {
      return await this.showAd();
    }
    return null;
  },
};

export default {
  getAdUnitId,
  initializeAdMob,
  BannerAdManager,
  InterstitialAdManager,
  RewardedAdManager,
  RewardedInterstitialAdManager,
};
