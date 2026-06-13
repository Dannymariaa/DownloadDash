import Constants from 'expo-constants';
import { Linking } from 'react-native';

const adsConfig = Constants.expoConfig?.extra?.ads || {
  provider: 'monetag',
  format: 'multitag',
  scriptSrc: 'https://3nbf4.com/88/tag.min.js',
  zoneId: '11099484',
  zones: {
    pushNotifications: '11099484',
    vignetteBanner: '11099483',
    inPagePush: '11099482',
    onclickPopunder: '11099481',
  },
};

// Backward-compatible helper for older imports.
export const getAdUnitId = (type, platform = null) => {
  return adsConfig.zoneId || null;
};

export const getAdsConfig = () => adsConfig;

const openProviderAd = async () => {
  if (!adsConfig.scriptSrc) {
    return false;
  }

  const supported = await Linking.canOpenURL(adsConfig.scriptSrc);
  if (!supported) {
    return false;
  }

  await Linking.openURL(adsConfig.scriptSrc);
  return true;
};

export const initializeAds = async () => {
  return Boolean(adsConfig.zoneId && adsConfig.scriptSrc);
};

export const BannerAdManager = {
  async show(placement = 'banner') {
    return initializeAds();
  },

  async hide() {
    return true;
  },
};

export const InterstitialAdManager = {
  async requestAd() {
    return initializeAds();
  },

  async showAd() {
    try {
      return await openProviderAd();
    } catch (error) {
      console.error('Failed to show ad:', error);
      return false;
    }
  },

  async show() {
    const requested = await this.requestAd();
    if (requested) {
      await this.showAd();
    }
  },
};

export const RewardedAdManager = {
  async requestAd() {
    return initializeAds();
  },

  async showAd() {
    try {
      const opened = await openProviderAd();
      return opened ? { amount: 1, type: 'ad-view' } : null;
    } catch (error) {
      console.error('Failed to show ad:', error);
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

export const RewardedInterstitialAdManager = {
  async requestAd() {
    return initializeAds();
  },

  async showAd() {
    try {
      const opened = await openProviderAd();
      return opened ? { amount: 1, type: 'ad-view' } : null;
    } catch (error) {
      console.error('Failed to show ad:', error);
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
  getAdsConfig,
  initializeAds,
  BannerAdManager,
  InterstitialAdManager,
  RewardedAdManager,
  RewardedInterstitialAdManager,
};
