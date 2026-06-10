import { loadAdsAfterDelay } from '@/utils/delayed-ads-loader';

// The web, PWA, and mobile web app use the same provider tag.

export const adConfig = {
  provider: 'monetag',
  format: 'multitag',
  scriptSrc: 'https://quge5.com/88/tag.min.js',
  zoneId: '246643',
  zoneIds: ['246643', '246109'],
  zones: {
    primaryTag: '246643',
    secondaryTag: '246109',
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
