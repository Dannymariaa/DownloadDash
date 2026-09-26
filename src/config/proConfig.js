export const DOWNLOADDASH_PLANS = {
  free: {
    name: 'DownloadDash Free',
    priceLabel: '$0',
  },
  pro: {
    name: 'DownloadDash Pro',
    priceLabel: import.meta.env?.VITE_DOWNLOADDASH_PRO_PRICE_LABEL || 'Coming soon',
  },
};
