const AD_PROVIDER_DOMAIN = '3nbf4.com';
const AD_PROVIDER_ZONE_ID = '11099484';
const AD_PROVIDER_ZONE_IDS = ['11099484', '11099483', '11099482', '11099481'];
const AD_PROVIDER_SCRIPT_SRC =
  import.meta.env.VITE_AD_PROVIDER_SCRIPT_SRC || `https://${AD_PROVIDER_DOMAIN}/88/tag.min.js`;

let adProviderLoadPromise;

export function shouldSuppressAds() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  const ua = navigator.userAgent || '';
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|lighthouse|pagespeed|chrome-lighthouse|gtmetrix|pingdom|webpagetest/i.test(ua);
}

function loadAdProviderScript() {
  if (!AD_PROVIDER_SCRIPT_SRC || typeof document === 'undefined' || shouldSuppressAds()) {
    return Promise.resolve(true);
  }

  const existingScript =
    document.querySelector("script[data-ad-provider-loaded='true']") ||
    document.querySelector(`script[src="${AD_PROVIDER_SCRIPT_SRC}"][data-zone="${AD_PROVIDER_ZONE_ID}"]`);

  if (existingScript) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.adProviderLoaded = 'true';
    script.dataset.zone = AD_PROVIDER_ZONE_ID;
    script.dataset.cfasync = 'false';
    script.src = AD_PROVIDER_SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
}

export function loadAdsAfterDelay({ immediate = false } = {}) {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (shouldSuppressAds()) {
    return Promise.resolve(false);
  }

  if (adProviderLoadPromise) {
    return adProviderLoadPromise;
  }

  adProviderLoadPromise = new Promise((resolve) => {
    let started = false;

    const loadAdProvider = () => {
      if (started) return;
      started = true;

      loadAdProviderScript().then(resolve);
    };

    if (immediate) {
      loadAdProvider();
      return;
    }

    window.addEventListener('scroll', loadAdProvider, { once: true, passive: true });
    window.addEventListener('click', loadAdProvider, { once: true });
    window.addEventListener('touchstart', loadAdProvider, { once: true, passive: true });
    window.addEventListener('keydown', loadAdProvider, { once: true });
    window.addEventListener('mousemove', loadAdProvider, { once: true, passive: true });
  });

  return adProviderLoadPromise;
}

export { AD_PROVIDER_DOMAIN, AD_PROVIDER_ZONE_ID, AD_PROVIDER_ZONE_IDS };
