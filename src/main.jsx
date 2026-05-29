const HOMEPAGE_BOOT_DELAY_MS = 30000;

let started = false;

const bootApp = () => {
  if (started) return;
  started = true;
  import('@/bootstrap.jsx');
};

const scheduleHomepageBoot = () => {
  window.setTimeout(bootApp, HOMEPAGE_BOOT_DELAY_MS);
};

if (window.location.pathname !== '/') {
  bootApp();
} else {
  window.addEventListener('click', bootApp, { once: true });
  window.addEventListener('keydown', bootApp, { once: true });
  window.addEventListener('touchstart', bootApp, { once: true, passive: true });
  window.addEventListener('scroll', bootApp, { once: true, passive: true });
  scheduleHomepageBoot();
}
