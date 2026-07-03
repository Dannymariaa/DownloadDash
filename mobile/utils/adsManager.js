import Constants from 'expo-constants';
import { Linking } from 'react-native';

const adsConfig = Constants.expoConfig?.extra?.ads || {
  provider: 'monetag',
  format: 'vignette',
  scriptSrc: 'https://n6wxm.com/vignette.min.js',
  zoneId: '11129621',
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

export default {
  getAdUnitId,
  getAdsConfig,
  initializeAds,
  BannerAdManager,
};
