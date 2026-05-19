const ADSENSE_CLIENT_ID = 'ca-pub-2390460896724446';
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
const ADSENSE_DELAY_MS = 9000;

let adsenseLoadPromise;

export function loadAdsenseAfterDelay() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (adsenseLoadPromise) {
    return adsenseLoadPromise;
  }

  adsenseLoadPromise = new Promise((resolve) => {
    let started = false;

    const loadAdsense = () => {
      if (started) return;
      started = true;

      const existingScript = document.querySelector("script[data-adsense-loaded='true']");

      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.adsenseLoaded = 'true';
      script.src = ADSENSE_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.head.appendChild(script);
    };

    window.addEventListener('scroll', loadAdsense, { once: true, passive: true });
    window.addEventListener('click', loadAdsense, { once: true });
    window.addEventListener('touchstart', loadAdsense, { once: true, passive: true });
    window.addEventListener('keydown', loadAdsense, { once: true });
    window.addEventListener('mousemove', loadAdsense, { once: true, passive: true });

    const scheduleFallback = () => {
      window.setTimeout(loadAdsense, ADSENSE_DELAY_MS);
    };

    if (document.readyState === 'complete') {
      scheduleFallback();
    } else {
      window.addEventListener('load', scheduleFallback, { once: true });
    }
  });

  return adsenseLoadPromise;
}

export { ADSENSE_CLIENT_ID };
