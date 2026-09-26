import { ADSTERRA_UNITS, MONETAG_CONFIG } from '@/config/adsterraConfig';
import adScheduler, { AD_FORMATS, AD_NETWORKS } from '@/lib/adScheduler';

const SCRIPT_ATTR = 'data-dd-ad-script';
const MONETAG_LAST_TRIGGER_KEY = 'downloaddash:monetag:last-trigger';

let activeBlockingAd = null;
let monetagLoadingPromise = null;

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

  async loadAdsterraBanner({ unit, container, placementId }) {
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
    if (!isBrowser()) return Promise.resolve(null);
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
    if (!isBrowser() || activeBlockingAd) return false;
    const last = Number(sessionStorage.getItem(MONETAG_LAST_TRIGGER_KEY) || 0);
    return adScheduler.canShowMultiTag(now) && (!last || now - last >= MONETAG_CONFIG.minIntervalMs);
  },

  async triggerMonetag() {
    if (!this.canTriggerMonetag()) return false;
    const decision = adScheduler.startInterruptiveAd({
      network: AD_NETWORKS.MONETAG,
      format: AD_FORMATS.MULTITAG,
    });
    if (!decision.allowed) return false;

    try {
      await this.loadMonetag();
      sessionStorage.setItem(MONETAG_LAST_TRIGGER_KEY, String(Date.now()));
      window.dispatchEvent(new CustomEvent('downloaddash:monetag-ready'));
      return true;
    } finally {
      window.setTimeout(() => {
        adScheduler.finishActiveAd('monetag-ready');
      }, 1500);
    }
  },
};

export default adManager;
