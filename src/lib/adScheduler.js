export const GLOBAL_INTERRUPTIVE_COOLDOWN_MS = 2 * 60 * 1000;
export const MULTITAG_MAIN_COOLDOWN_MS = 5 * 60 * 1000;
export const ACTIVE_AD_TIMEOUT_MS = 45 * 1000;

export const AD_NETWORKS = {
  ADSTERRA: 'adsterra',
  MONETAG: 'monetag',
};

export const AD_FORMATS = {
  MULTITAG: 'multitag',
  REWARDED_GATE: 'rewarded-gate',
  POPUP: 'popup',
  POPUNDER: 'popunder',
  DIRECT_LINK: 'direct-link',
  INTERSTITIAL: 'interstitial',
};

const REDIRECT_FORMATS = new Set([
  AD_FORMATS.POPUP,
  AD_FORMATS.POPUNDER,
  AD_FORMATS.DIRECT_LINK,
]);

const DEFAULT_DENIED_AD_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'spankbang.com',
  'tube8.com',
  'cam4.com',
  'chaturbate.com',
  'stripchat.com',
  'livejasmin.com',
  'adultfriendfinder.com',
];

const normalizeHostname = (hostname) => String(hostname || '').trim().toLowerCase().replace(/\.$/, '');

const domainMatches = (hostname, deniedDomain) => {
  const host = normalizeHostname(hostname);
  const denied = normalizeHostname(deniedDomain);
  return host === denied || host.endsWith(`.${denied}`);
};

export function isSafeAdDestination(destinationUrl, deniedDomains = DEFAULT_DENIED_AD_DOMAINS) {
  if (!destinationUrl || typeof destinationUrl !== 'string') {
    return { safe: false, reason: 'missing-destination' };
  }

  let parsed;
  try {
    parsed = new URL(destinationUrl);
  } catch {
    return { safe: false, reason: 'malformed-destination' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'blocked-protocol' };
  }

  const deniedDomain = deniedDomains.find((domain) => domainMatches(parsed.hostname, domain));
  if (deniedDomain) {
    return { safe: false, reason: 'adult-denied-domain', domain: deniedDomain };
  }

  return { safe: true, url: parsed.href };
}

export function createAdScheduler({
  now = () => Date.now(),
  setTimer = typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout,
  clearTimer = typeof window !== 'undefined' ? window.clearTimeout.bind(window) : clearTimeout,
  deniedDomains = DEFAULT_DENIED_AD_DOMAINS,
} = {}) {
  let nowFn = now;
  let lastAnyAdAt = null;
  let lastMultiTagAt = null;
  let redirectAttemptedThisPage = false;
  let activeAd = null;
  let activeTimer = null;
  const injectedScripts = new Set();
  const startedDownloadActions = new Set();

  const currentTime = () => Number(nowFn());

  const clearActiveTimer = () => {
    if (activeTimer) {
      clearTimer(activeTimer);
      activeTimer = null;
    }
  };

  const finishActiveAd = (reason = 'finished') => {
    clearActiveTimer();
    if (activeAd) {
      activeAd.finishedAt = currentTime();
      activeAd.finishReason = reason;
    }
    activeAd = null;
  };

  const canShowAnyAd = (at = currentTime()) => {
    if (activeAd) return false;
    return lastAnyAdAt === null || at - lastAnyAdAt >= GLOBAL_INTERRUPTIVE_COOLDOWN_MS;
  };

  const canShowMultiTag = (at = currentTime()) => {
    if (!canShowAnyAd(at)) return false;
    return lastMultiTagAt === null || at - lastMultiTagAt >= MULTITAG_MAIN_COOLDOWN_MS;
  };

  const canRedirect = () => !redirectAttemptedThisPage;

  const startInterruptiveAd = ({
    network,
    format,
    destinationUrl,
    actionId,
    timeoutMs = ACTIVE_AD_TIMEOUT_MS,
  }) => {
    const at = currentTime();
    const isRedirect = REDIRECT_FORMATS.has(format);

    if (activeAd) return { allowed: false, reason: 'active-ad' };
    if (!canShowAnyAd(at)) return { allowed: false, reason: 'global-cooldown' };
    if (format === AD_FORMATS.MULTITAG && !canShowMultiTag(at)) {
      return { allowed: false, reason: 'multitag-cooldown' };
    }
    if (isRedirect && !canRedirect()) {
      return { allowed: false, reason: 'redirect-limit' };
    }
    if (destinationUrl) {
      const destination = isSafeAdDestination(destinationUrl, deniedDomains);
      if (!destination.safe) return { allowed: false, reason: 'unsafe-destination', detail: destination };
    }

    if (isRedirect) redirectAttemptedThisPage = true;
    lastAnyAdAt = at;
    if (format === AD_FORMATS.MULTITAG || network === AD_NETWORKS.MONETAG) {
      lastMultiTagAt = at;
    }

    activeAd = {
      network,
      format,
      actionId: actionId || null,
      startedAt: at,
    };

    clearActiveTimer();
    activeTimer = setTimer(() => finishActiveAd('timeout'), timeoutMs);
    if (typeof activeTimer?.unref === 'function') activeTimer.unref();

    return { allowed: true, reason: 'allowed', activeAd: { ...activeAd } };
  };

  const startDownloadAd = (actionId) => {
    if (!actionId || startedDownloadActions.has(actionId)) {
      return { allowed: false, reason: 'duplicate-download-action' };
    }

    const decision = startInterruptiveAd({
      network: AD_NETWORKS.ADSTERRA,
      format: AD_FORMATS.REWARDED_GATE,
      actionId,
    });

    if (decision.allowed) startedDownloadActions.add(actionId);
    return decision;
  };

  return {
    setNow(nextNow) {
      nowFn = nextNow;
    },
    canShowAnyAd,
    canShowMultiTag,
    canRedirect,
    startInterruptiveAd,
    startDownloadAd,
    finishActiveAd,
    noteSpaNavigation() {
      return false;
    },
    markScriptInjected(id) {
      if (!id || injectedScripts.has(id)) return false;
      injectedScripts.add(id);
      return true;
    },
    clearScriptInjected(id) {
      injectedScripts.delete(id);
    },
    hasScriptInjected(id) {
      return injectedScripts.has(id);
    },
    snapshot() {
      return {
        lastAnyAdAt,
        lastMultiTagAt,
        redirectAttemptedThisPage,
        activeAd: activeAd ? { ...activeAd } : null,
        startedDownloadActions: [...startedDownloadActions],
        injectedScripts: [...injectedScripts],
      };
    },
  };
}

export const adScheduler = createAdScheduler();

export default adScheduler;
