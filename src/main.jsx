const HOMEPAGE_BOOT_DELAY_MS = 5000;

let started = false;

const bootApp = () => {
  if (started) return;
  started = true;
  import('@/bootstrap.jsx');
};

if (window.location.pathname !== '/') {
  bootApp();
} else {
  const bootOnIdle = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(bootApp, { timeout: HOMEPAGE_BOOT_DELAY_MS });
      return;
    }

    window.setTimeout(bootApp, HOMEPAGE_BOOT_DELAY_MS);
  };

  window.addEventListener('click', bootApp, { once: true });
  window.addEventListener('keydown', bootApp, { once: true });
  window.addEventListener('touchstart', bootApp, { once: true, passive: true });
  window.addEventListener('scroll', bootApp, { once: true, passive: true });

  if (document.readyState === 'complete') {
    bootOnIdle();
  } else {
    window.addEventListener('load', bootOnIdle, { once: true });
  }
}
