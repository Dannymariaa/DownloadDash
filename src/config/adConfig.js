import { loadAdsAfterDelay } from '@/utils/delayed-ads-loader';

// The web, PWA, and mobile web app use the same provider tag.

export const adConfig = {
  provider: 'monetag',
  format: 'placement-zones',
  scriptSrc: 'https://nap5k.com/tag.min.js',
  zoneId: '11129612',
  zoneIds: ['11129612', '11129621'],
  zones: {
    inPagePush: '11129612',
    vignetteBanner: '11129621',
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

export default adConfig;
