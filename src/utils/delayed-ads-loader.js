const AD_PROVIDER_DOMAIN = 'nap5k.com';
const AD_PROVIDER_ZONE_ID = '11129612';

const MONETAG_ZONES = {
  inPagePush: {
    id: import.meta.env.VITE_MONETAG_IN_PAGE_PUSH_ZONE || '11129612',
    scriptSrc: import.meta.env.VITE_MONETAG_IN_PAGE_PUSH_SRC || 'https://nap5k.com/tag.min.js',
  },
  vignette: {
    id: import.meta.env.VITE_MONETAG_VIGNETTE_ZONE || '11129621',
    scriptSrc: import.meta.env.VITE_MONETAG_VIGNETTE_SRC || 'https://n6wxm.com/vignette.min.js',
  },
  // Additional zones for enhanced coverage
  zone1: {
    id: import.meta.env.VITE_MONETAG_ZONE1_ID || '246643',
    scriptSrc: import.meta.env.VITE_MONETAG_ZONE1_SRC || 'https://quge5.com/88/tag.min.js',
  },
  zone2: {
    id: import.meta.env.VITE_MONETAG_ZONE2_ID || '246109',
    scriptSrc: import.meta.env.VITE_MONETAG_ZONE2_SRC || 'https://quge5.com/88/tag.min.js',
  },
};

const parseZoneIds = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[,\s]+/)
    .map((id) => String(id).trim())
    .filter(Boolean);
};

let AD_PROVIDER_ZONE_IDS = parseZoneIds(import.meta.env.VITE_AD_PROVIDER_ZONE_IDS);
if (!AD_PROVIDER_ZONE_IDS || AD_PROVIDER_ZONE_IDS.length === 0) {
  AD_PROVIDER_ZONE_IDS = [MONETAG_ZONES.inPagePush.id];
}

const AD_PROVIDER_SCRIPT_SRC =
  import.meta.env.VITE_AD_PROVIDER_SCRIPT_SRC || MONETAG_ZONES.inPagePush.scriptSrc;

const adProviderLoadPromises = new Map();

export function shouldSuppressAds() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  const ua = navigator.userAgent || '';
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|lighthouse|pagespeed|chrome-lighthouse|gtmetrix|pingdom|webpagetest/i.test(ua);
}

const getPlacementZone = (placement = 'banner') => {
  if (placement === 'vignette') {
    return MONETAG_ZONES.vignette;
  }
  return {
    id: AD_PROVIDER_ZONE_IDS[0] || MONETAG_ZONES.inPagePush.id,
    scriptSrc: AD_PROVIDER_SCRIPT_SRC,
  };
};

function loadAdProviderScript(placement = 'banner') {
  const zone = getPlacementZone(placement);

  if (!zone?.scriptSrc || !zone?.id || typeof document === 'undefined' || shouldSuppressAds()) {
    return Promise.resolve(true);
  }

  const existingScript =
    document.querySelector(`script[data-ad-provider-loaded='true'][data-zone="${zone.id}"]`) ||
    document.querySelector(`script[src="${zone.scriptSrc}"][data-zone="${zone.id}"]`);

  if (existingScript) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.adProviderLoaded = 'true';
    script.dataset.zone = zone.id;
    script.dataset.cfasync = 'false';
    script.src = zone.scriptSrc;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
}

export function loadAdsAfterDelay({ immediate = false, placement = 'banner' } = {}) {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (shouldSuppressAds()) {
    return Promise.resolve(false);
  }

  if (adProviderLoadPromises.has(placement)) {
    return adProviderLoadPromises.get(placement);
  }

  const loadPromise = new Promise((resolve) => {
    let started = false;
    let fallbackTimer = null;

    const cleanup = () => {
      window.removeEventListener('scroll', loadAdProvider);
      window.removeEventListener('click', loadAdProvider);
      window.removeEventListener('touchstart', loadAdProvider);
      window.removeEventListener('keydown', loadAdProvider);
      window.removeEventListener('mousemove', loadAdProvider);
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const loadAdProvider = () => {
      if (started) return;
      started = true;
      cleanup();

      loadAdProviderScript(placement).then((result) => resolve(result));
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

    fallbackTimer = window.setTimeout(loadAdProvider, 2500);
  });

  adProviderLoadPromises.set(placement, loadPromise);
  return loadPromise;
}

export { AD_PROVIDER_DOMAIN, AD_PROVIDER_ZONE_ID, AD_PROVIDER_ZONE_IDS, MONETAG_ZONES };
