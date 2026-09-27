import { ADSTERRA_UNITS, MONETAG_CONFIG } from '@/config/adsterraConfig';
import adScheduler, { AD_FORMATS, AD_NETWORKS, NOTIFICATION_GUARD_BLOCKED } from '@/lib/adScheduler';

const SCRIPT_ATTR = 'data-dd-ad-script';

let activeBlockingAd = null;
let monetagLoadingPromise = null;
let browserAdGuardsInstalled = false;
let originalNotification = null;
let originalShowNotification = null;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const queryScript = (id) => {
  if (!isBrowser()) return null;
  return document.querySelector(`script[${SCRIPT_ATTR}="${id}"]`);
};

const loadExternalScript = ({ id, src, parent = document.body, attrs = {}, forceReload = false }) =>
  new Promise((resolve, reject) => {
    if (!isBrowser() || !src) {
      resolve(null);
      return;
    }
    if (adScheduler.hasAdFreeEntitlement()) {
      resolve(null);
      return;
    }

    const existing = queryScript(id);
    if (existing || adScheduler.hasScriptInjected(id)) {
      if (existing && forceReload) {
        existing.remove();
        adScheduler.clearScriptInjected(id);
      } else if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve(existing);
          return;
        }
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      } else if (!forceReload) {
        resolve(null);
        return;
      }
    }

    adScheduler.markScriptInjected(id);

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, id);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (value === true) script.setAttribute(key, '');
      else script.setAttribute(key, String(value));
    });
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve(script);
    });
    script.addEventListener('error', (error) => {
      adScheduler.clearScriptInjected(id);
      reject(error);
    });
    parent.appendChild(script);
  });

const hasInjectedFrame = (container) =>
  !!container?.querySelector('iframe, ins, object, embed, [data-dd-ad-filled="true"]');

const clearProviderMarkup = (container) => {
  if (!container) return;
  container.querySelectorAll('iframe, ins, object, embed, script').forEach((node) => {
    const scriptId = node.getAttribute?.(SCRIPT_ATTR);
    if (scriptId) adScheduler.clearScriptInjected(scriptId);
    node.remove();
  });
};

const finishNotificationSoon = (reason) => {
  if (!isBrowser()) return;
  window.setTimeout(() => {
    adScheduler.finishNotificationAd(reason);
  }, 1500);
};

const createBlockedNotification = (title, options) => {
  const target = typeof EventTarget === 'function' ? new EventTarget() : {};
  Object.defineProperties(target, {
    title: { value: String(title || ''), enumerable: true },
    body: { value: options?.body || '', enumerable: true },
    tag: { value: options?.tag || NOTIFICATION_GUARD_BLOCKED, enumerable: true },
    close: { value: () => {}, enumerable: true },
  });
  return target;
};

const installBrowserAdGuards = () => {
  if (!isBrowser() || browserAdGuardsInstalled) return false;
  browserAdGuardsInstalled = true;

  if (typeof window.Notification === 'function') {
    originalNotification = window.Notification;
    const GuardedNotification = function GuardedNotification(title, options = {}) {
      const decision = adScheduler.startBrowserNotificationAd(`notification:${options.tag || title || Date.now()}`);
      if (!decision.allowed) return createBlockedNotification(title, options);

      try {
        return new originalNotification(title, options);
      } finally {
        finishNotificationSoon('browser-notification-returned');
      }
    };

    Object.setPrototypeOf(GuardedNotification, originalNotification);
    GuardedNotification.prototype = originalNotification.prototype;
    Object.defineProperties(GuardedNotification, {
      permission: { get: () => originalNotification.permission },
      maxActions: { get: () => originalNotification.maxActions },
      requestPermission: {
        value: (...args) => originalNotification.requestPermission(...args),
      },
    });
    window.Notification = GuardedNotification;
  }

  const serviceWorkerRegistration = window.ServiceWorkerRegistration?.prototype;
  if (serviceWorkerRegistration?.showNotification && !originalShowNotification) {
    originalShowNotification = serviceWorkerRegistration.showNotification;
    serviceWorkerRegistration.showNotification = function guardedShowNotification(title, options = {}) {
      const decision = adScheduler.startBrowserNotificationAd(`sw-notification:${options.tag || title || Date.now()}`);
      if (!decision.allowed) return Promise.resolve(undefined);

      return Promise.resolve(originalShowNotification.call(this, title, options)).finally(() => {
        finishNotificationSoon('service-worker-notification-returned');
      });
    };
  }

  return true;
};

export const adManager = {
  beginBlockingAd(provider = 'rewarded') {
    if (activeBlockingAd && activeBlockingAd !== provider) return false;
    activeBlockingAd = provider;
    return true;
  },

  endBlockingAd(provider = 'rewarded') {
    if (!activeBlockingAd || activeBlockingAd === provider) {
      activeBlockingAd = null;
    }
  },

  isBlockingAdActive() {
    return !!activeBlockingAd;
  },

  installBrowserAdGuards,

  requestAdRedirect({
    network = AD_NETWORKS.MONETAG,
    format = AD_FORMATS.POPUNDER,
    destinationUrl,
    actionId,
    launch,
    timeoutMs = 1500,
  } = {}) {
    return adScheduler.requestAdRedirect({
      network,
      format,
      destinationUrl,
      actionId,
      timeoutMs,
      launch,
    });
  },

  async loadAdsterraBanner({ unit, container, placementId }) {
    if (adScheduler.hasAdFreeEntitlement()) return false;
    if (!isBrowser() || !unit || !container) return false;
    if (hasInjectedFrame(container)) return true;

    clearProviderMarkup(container);
    window.atOptions = {
      key: unit.key,
      format: 'iframe',
      height: unit.height,
      width: unit.width,
      params: {},
    };

    const script = await loadExternalScript({
      id: `adsterra:${unit.key}:${placementId}`,
      src: unit.scriptSrc,
      parent: container,
      attrs: {
        type: 'text/javascript',
        'data-ad-provider': 'adsterra',
        'data-ad-unit': unit.key,
        'data-ad-placement': placementId,
      },
    });
    return !!script;
  },

  async loadAdsterraNative({ container }) {
    if (adScheduler.hasAdFreeEntitlement()) return false;
    const unit = ADSTERRA_UNITS.nativeBanner;
    if (!isBrowser() || !container) return false;
    if (hasInjectedFrame(container) || container.children.length > 0) return true;

    await loadExternalScript({
      id: 'adsterra:native:global',
      src: unit.scriptSrc,
      attrs: {
        'data-cfasync': 'false',
        'data-ad-provider': 'adsterra',
        'data-ad-unit': 'native',
      },
    });
    return true;
  },

  cleanupAdContainer(container) {
    clearProviderMarkup(container);
  },

  loadMonetag() {
    if (adScheduler.hasAdFreeEntitlement()) return Promise.resolve(null);
    if (!isBrowser()) return Promise.resolve(null);
    this.installBrowserAdGuards();
    if (!MONETAG_CONFIG.enablePersistentMultiTag) return Promise.resolve(null);
    if (!monetagLoadingPromise) {
      monetagLoadingPromise = loadExternalScript({
        id: `monetag:${MONETAG_CONFIG.zone}`,
        src: MONETAG_CONFIG.scriptSrc,
        attrs: {
          'data-zone': MONETAG_CONFIG.zone,
          'data-cfasync': 'false',
          'data-ad-provider': 'monetag',
        },
      }).catch((error) => {
        monetagLoadingPromise = null;
        throw error;
      });
    }
    return monetagLoadingPromise;
  },

  canTriggerMonetag(now = Date.now()) {
    if (!isBrowser() || activeBlockingAd || adScheduler.hasAdFreeEntitlement()) return false;
    return (
      MONETAG_CONFIG.enablePersistentMultiTag &&
      adScheduler.canShowMultiTag(now) &&
      adScheduler.canRedirect()
    );
  },

  async triggerMonetag() {
    if (!this.canTriggerMonetag()) return false;
    const decision = adScheduler.requestAdRedirect({
      network: AD_NETWORKS.MONETAG,
      format: AD_FORMATS.MULTITAG,
      actionId: 'monetag-multitag',
      timeoutMs: 1500,
    });
    if (!decision.allowed) return false;

    try {
      await this.loadMonetag();
      window.dispatchEvent(new CustomEvent('downloaddash:monetag-ready'));
      return true;
    } finally {
      window.setTimeout(() => {
        adScheduler.finishActiveAd('monetag-ready');
      }, 1500);
    }
  },

  startMonetagNotificationScheduler(delayMs = 2500) {
    if (adScheduler.hasAdFreeEntitlement()) {
      return { started: false, reason: 'ad-free-entitlement' };
    }
    return adScheduler.startNotificationScheduler(() => {
      this.triggerMonetag().catch((error) => {
        console.warn('Monetag trigger failed', error);
      });
    }, delayMs);
  },

  stopMonetagNotificationScheduler() {
    return adScheduler.stopNotificationScheduler();
  },
};

export default adManager;
