export const AD_DISPLAY_INTERVAL_MS = 60 * 1000;

const LAST_AD_SHOWN_KEY = 'downloaddash:last-ad-shown-at';
let lastAdShownAt = 0;

const readLastAdShownAt = () => {
  if (typeof window === 'undefined') return lastAdShownAt;

  try {
    const stored = Number(window.localStorage.getItem(LAST_AD_SHOWN_KEY));
    return Number.isFinite(stored) ? Math.max(stored, lastAdShownAt) : lastAdShownAt;
  } catch {
    return lastAdShownAt;
  }
};

export const canShowTimedAd = (now = Date.now()) => now - readLastAdShownAt() >= AD_DISPLAY_INTERVAL_MS;

export const markTimedAdShown = (now = Date.now()) => {
  lastAdShownAt = now;

  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LAST_AD_SHOWN_KEY, String(now));
  } catch {
    // Local storage can be blocked; the in-memory timestamp still throttles this session.
  }
};
