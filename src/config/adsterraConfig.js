/**
 * Adsterra Ad Configuration
 * Replaces Monetag with responsive Adsterra banner ads
 */

export const ADSTERRA_UNITS = {
  // Native Banner - HD Video Unlock Popup
  nativeBanner: {
    id: '30079457',
    name: 'Native Banner',
    format: 'native',
    scriptSrc: 'https://pl30179956.effectivecpmnetwork.com/deb9ee3e2f39503eb7a9d1619e78739f/invoke.js',
    containerId: 'container-deb9ee3e2f39503eb7a9d1619e78739f',
  },

  // Banner 320x50 - Mobile
  banner320x50: {
    id: '30079458',
    name: 'Banner 320x50',
    format: 'iframe',
    width: 320,
    height: 50,
    key: 'c1a1efe79c0f2963e83460ce138fae10',
    scriptSrc: 'https://www.highperformanceformat.com/c1a1efe79c0f2963e83460ce138fae10/invoke.js',
    breakpoint: 768, // Mobile: < 768px
  },

  // Banner 728x90 - Desktop/Tablet
  banner728x90: {
    id: '30079459',
    name: 'Banner 728x90',
    format: 'iframe',
    width: 728,
    height: 90,
    key: '630c6c9a5f2b0f771022aff6e8e18ca7',
    scriptSrc: 'https://www.highperformanceformat.com/630c6c9a5f2b0f771022aff6e8e18ca7/invoke.js',
    breakpoint: 768, // Desktop: >= 768px
  },

  // Banner 300x250 - Optional, below content
  banner300x250: {
    id: '30079460',
    name: 'Banner 300x250',
    format: 'iframe',
    width: 300,
    height: 250,
    key: '25fdf0e506fec8285d21a27d4bc83eb2',
    scriptSrc: 'https://www.highperformanceformat.com/25fdf0e506fec8285d21a27d4bc83eb2/invoke.js',
    breakpoint: 768, // Desktop only
  },
};

/**
 * Helper to get responsive banner (320x50 or 728x90 based on viewport)
 * @returns {Object} Banner configuration object
 */
export const getResponsiveBanner = () => {
  if (typeof window === 'undefined') {
    return ADSTERRA_UNITS.banner728x90; // Default to desktop in SSR
  }
  return window.innerWidth < ADSTERRA_UNITS.banner320x50.breakpoint
    ? ADSTERRA_UNITS.banner320x50
    : ADSTERRA_UNITS.banner728x90;
};

/**
 * Load an Adsterra script once per container
 * Prevents duplicate injections on React rerenders
 * @param {string} containerId - HTML element ID
 * @param {string} scriptSrc - Script source URL
 * @param {Object} atOptions - Optional atOptions for iframe format
 */
export const loadAdsterraScript = (containerId, scriptSrc, atOptions = null) => {
  if (typeof document === 'undefined') return;

  // Check if script already loaded for this container
  const existingScript = document.querySelector(
    `script[src="${scriptSrc}"][data-container="${containerId}"]`
  );
  if (existingScript) return;

  // Set atOptions for iframe-based ads
  if (atOptions) {
    window.atOptions = atOptions;
  }

  // Create and inject script
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.async = true;
  script.dataset.container = containerId;
  document.body.appendChild(script);
};

export default {
  ADSTERRA_UNITS,
  getResponsiveBanner,
  loadAdsterraScript,
};
