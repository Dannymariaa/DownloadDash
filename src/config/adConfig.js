import { loadAdsAfterDelay } from '@/utils/delayed-ads-loader';

// The web, PWA, and mobile web app use the same provider tag.

export const adConfig = {
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
  dataCfasync: 'false',
};

export const getPlatformAdConfig = () => {
  return adConfig;
};

export const initializeAds = () => {
  if (typeof window !== 'undefined') {
    return loadAdsAfterDelay();
  }

  return Promise.resolve(false);
};

export const displayBannerAd = () => {
  if (typeof window !== 'undefined') {
    return loadAdsAfterDelay();
  }

  return Promise.resolve(false);
};

export const showInterstitialAd = async () => {
  try {
    return await loadAdsAfterDelay();
  } catch (e) {
    console.log('Interstitial ad error:', e);
    return false;
  }
};

export const showRewardedAd = async () => {
  try {
    return await loadAdsAfterDelay();
  } catch (e) {
    console.log('Rewarded ad error:', e);
    return false;
  }
};

export default adConfig;
