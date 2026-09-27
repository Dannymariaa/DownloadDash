import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_FORMATS,
  AD_NETWORKS,
  createAdScheduler,
  isSafeAdDestination,
} from '../../src/lib/adScheduler.js';

test('MultiTag redirects are permanently disabled', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  const decision = scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'redirect-format-disabled');
  assert.equal(scheduler.canShowMultiTag(), false);
});

test('Monetag redirect requests never launch provider code', () => {
  const scheduler = createAdScheduler({ now: () => 0 });
  let launched = false;

  const decision = scheduler.requestAdRedirect({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
    launch: () => {
      launched = true;
    },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'redirect-format-disabled');
  assert.equal(launched, false);
});

test('Monetag cooldown eligibility opens after 5 minutes when redirect was not used', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.NOTIFICATION,
  }).allowed, true);
  scheduler.finishActiveAd('done');

  for (const blockedAt of [1_000, 60_000, 299_000]) {
    scheduler.setNow(() => blockedAt);
    assert.equal(scheduler.canShowMultiTag(blockedAt), false);
  }

  scheduler.setNow(() => 300_000);
  assert.equal(scheduler.canShowMultiTag(300_000), false);
});

test('normal interruptive ads cannot run twice inside 2 minutes', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.REWARDED_GATE,
  }).allowed, true);
  scheduler.finishActiveAd('done');

  scheduler.setNow(() => 119_999);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.REWARDED_GATE,
  }).allowed, false);

  scheduler.setNow(() => 120_000);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.REWARDED_GATE,
  }).allowed, true);
});

test('Adsterra rewarded gate blocks Monetag redirect attempts while active', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.REWARDED_GATE,
  }).allowed, true);

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
  }).allowed, false);
  assert.equal(scheduler.snapshot().activeAd.network, AD_NETWORKS.ADSTERRA);
});

test('zero redirects or popunders are allowed per page load', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).reason, 'redirect-format-disabled');

  scheduler.setNow(() => 10 * 60 * 1000);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.DIRECT_LINK,
    destinationUrl: 'https://ads.example/path',
  }).allowed, false);
});

test('SPA route change does not reset redirect limit', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUP,
  }).reason, 'redirect-format-disabled');
  scheduler.noteSpaNavigation('/next-page');

  scheduler.setNow(() => 10 * 60 * 1000);
  assert.equal(scheduler.canRedirect(), false);
});

test('full reload still keeps redirects disabled', () => {
  const pageState = {};
  const scheduler = createAdScheduler({ now: () => 0, pageState });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUP,
  }).reason, 'redirect-format-disabled');
  assert.equal(scheduler.canRedirect(), false);

  const remountedScheduler = createAdScheduler({ now: () => 0, pageState });
  assert.equal(remountedScheduler.canRedirect(), false);

  const freshPageScheduler = createAdScheduler({ now: () => 0, pageState: {} });
  assert.equal(freshPageScheduler.canRedirect(), false);
});

test('double-click creates at most one ad', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  const first = scheduler.startDownloadAd('download-1');
  const second = scheduler.startDownloadAd('download-1');

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(scheduler.snapshot().startedDownloadActions.length, 1);
});

test('duplicate render does not inject duplicate scripts', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.markScriptInjected('monetag:246109'), true);
  assert.equal(scheduler.markScriptInjected('monetag:246109'), false);
  assert.equal(scheduler.markScriptInjected('adsterra:banner:top'), true);
});

test('notification ads obey a rolling 2 per 5 minutes limit with a 2 minute minimum gap', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');

  scheduler.setNow(() => 1_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 30_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 119_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 120_000);
  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');

  scheduler.setNow(() => 121_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 299_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 300_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 300_001);
  assert.equal(scheduler.startNotificationAd().allowed, true);
});

test('blocked notification triggers are discarded instead of queued', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');

  for (const blockedAt of [1_000, 30_000, 119_000]) {
    scheduler.setNow(() => blockedAt);
    assert.equal(scheduler.startNotificationAd().allowed, false);
  }

  assert.deepEqual(scheduler.snapshot().notificationHistory, [0]);

  scheduler.setNow(() => 120_000);
  assert.equal(scheduler.startNotificationAd().allowed, true);
  assert.deepEqual(scheduler.snapshot().notificationHistory, [0, 120_000]);
});

test('notification rolling window blocks until the oldest timestamp expires', () => {
  const scheduler = createAdScheduler({ now: () => 10 * 60 * 1000 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');

  scheduler.setNow(() => 12 * 60 * 1000 + 10_000);
  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');

  scheduler.setNow(() => 13 * 60 * 1000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setNow(() => 15 * 60 * 1000 + 1);
  assert.equal(scheduler.startNotificationAd().allowed, true);
});

test('notification active lock blocks simultaneous notification ads', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  assert.equal(scheduler.startNotificationAd().allowed, false);
});

test('100 notification triggers in one second allow at most one notification', () => {
  const scheduler = createAdScheduler({ now: () => 0 });
  let allowed = 0;

  for (let index = 0; index < 100; index += 1) {
    if (scheduler.startNotificationAd().allowed) allowed += 1;
  }

  assert.equal(allowed, 1);
});

test('notification stress test never exceeds two in any rolling five minute window', () => {
  let now = 0;
  const scheduler = createAdScheduler({ now: () => now });
  const allowedAt = [];

  for (let second = 0; second <= 10 * 60; second += 1) {
    now = second * 1000;
    const decision = scheduler.startNotificationAd();
    if (decision.allowed) {
      allowedAt.push(now);
      scheduler.finishNotificationAd('closed');
    }
  }

  for (const timestamp of allowedAt) {
    const countInWindow = allowedAt.filter((other) => other >= timestamp && other < timestamp + 5 * 60 * 1000).length;
    assert.ok(countInWindow <= 2);
  }

  for (let index = 1; index < allowedAt.length; index += 1) {
    assert.ok(allowedAt[index] - allowedAt[index - 1] >= 2 * 60 * 1000);
  }
});

test('notification route changes preserve limiter history', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('closed');
  scheduler.noteSpaNavigation('/notifications');

  scheduler.setNow(() => 60_000);
  assert.equal(scheduler.startNotificationAd().allowed, false);
});

test('notification history survives scheduler recreation through storage', () => {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };

  const firstScheduler = createAdScheduler({ now: () => 0, localStorage });
  assert.equal(firstScheduler.startNotificationAd().allowed, true);
  firstScheduler.finishNotificationAd('closed');

  const remountedScheduler = createAdScheduler({ now: () => 60_000, localStorage });
  assert.equal(remountedScheduler.startNotificationAd().allowed, false);
  assert.deepEqual(remountedScheduler.snapshot().notificationHistory, [0]);
});

test('redirect disablement is per product policy and does not reset for fresh scheduler instances', () => {
  const pageState = {};
  const scheduler = createAdScheduler({ now: () => 0, pageState });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).reason, 'redirect-format-disabled');
  scheduler.noteSpaNavigation('/download');

  scheduler.setNow(() => 30 * 60 * 1000);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).reason, 'redirect-format-disabled');

  const remountedScheduler = createAdScheduler({ now: () => 30 * 60 * 1000, pageState });
  assert.equal(remountedScheduler.canRedirect(), false);

  const afterFullReload = createAdScheduler({ now: () => 0, pageState: {} });
  assert.equal(afterFullReload.canRedirect(), false);
});

test('redirect stress test allows zero popunder attempts across repeated clicks and route changes', () => {
  let now = 0;
  const scheduler = createAdScheduler({ now: () => now });
  let allowed = 0;

  for (let index = 0; index < 100; index += 1) {
    now = index * 1000;
    const decision = scheduler.startInterruptiveAd({
      network: AD_NETWORKS.MONETAG,
      format: AD_FORMATS.POPUNDER,
    });
    if (decision.allowed) {
      allowed += 1;
      scheduler.finishActiveAd('closed');
    }
    if (index === 20) scheduler.noteSpaNavigation('/another-route');
  }

  assert.equal(allowed, 0);
});

test('requestAdRedirect blocks before launching provider code', () => {
  const scheduler = createAdScheduler({ now: () => 0 });
  const observed = [];

  const decision = scheduler.requestAdRedirect({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
    launch: () => {
      observed.push(scheduler.canRedirect());
      return 'opened';
    },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'redirect-format-disabled');
  assert.equal(decision.launchResult, undefined);
  assert.deepEqual(observed, []);
  assert.equal(scheduler.canRedirect(), false);
});

test('requestAdRedirect blocks 100 repeated clicks without any redirect', () => {
  let now = 0;
  const scheduler = createAdScheduler({ now: () => now });
  let redirects = 0;

  for (let index = 0; index < 101; index += 1) {
    now = index * 100;
    const decision = scheduler.requestAdRedirect({
      network: AD_NETWORKS.MONETAG,
      format: AD_FORMATS.POPUNDER,
      launch: () => {
        redirects += 1;
      },
    });
    if (decision.allowed) scheduler.finishActiveAd('closed');
  }

  assert.equal(redirects, 0);
});

test('shared redirect policy blocks Monetag and Adsterra direct links in either order', () => {
  const monetagFirst = createAdScheduler({ now: () => 0 });

  assert.equal(monetagFirst.requestAdRedirect({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).reason, 'redirect-format-disabled');
  monetagFirst.setNow(() => 100);
  assert.equal(monetagFirst.requestAdRedirect({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.DIRECT_LINK,
  }).reason, 'redirect-format-disabled');

  const adsterraFirst = createAdScheduler({ now: () => 0 });
  assert.equal(adsterraFirst.requestAdRedirect({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.DIRECT_LINK,
  }).reason, 'redirect-format-disabled');
  adsterraFirst.setNow(() => 100);
  assert.equal(adsterraFirst.requestAdRedirect({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).reason, 'redirect-format-disabled');
});

test('notification scheduler creates only one timer across rerenders', () => {
  let timerCount = 0;
  const scheduler = createAdScheduler({
    now: () => 0,
    setTimer: () => {
      timerCount += 1;
      return timerCount;
    },
    clearTimer: () => {},
  });

  const callback = () => {};
  assert.equal(scheduler.startNotificationScheduler(callback, 1000).started, true);
  assert.equal(scheduler.startNotificationScheduler(callback, 1000).started, false);
  assert.equal(timerCount, 1);
  assert.equal(scheduler.snapshot().notificationSchedulerActive, true);
});

test('active ad blocks another interruptive ad', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startDownloadAd('download-1').allowed, true);
  assert.equal(scheduler.startDownloadAd('download-2').allowed, false);
});

test('blocked destination does not navigate', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  const decision = scheduler.startInterruptiveAd({
    network: AD_NETWORKS.ADSTERRA,
    format: AD_FORMATS.DIRECT_LINK,
    destinationUrl: 'https://pornhub.com/watch',
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'redirect-format-disabled');
});

test('javascript and data ad URLs are rejected', () => {
  assert.equal(isSafeAdDestination('javascript:alert(1)').safe, false);
  assert.equal(isSafeAdDestination('data:text/html;base64,PGgxPkFkPC9oMT4=').safe, false);
  assert.equal(isSafeAdDestination('https://ads.example/path').safe, true);
});

test('Pro ad-free entitlement blocks all ad launches and script registration', () => {
  const scheduler = createAdScheduler({ now: () => 0, entitlements: { adFree: true } });

  assert.equal(scheduler.canShowAnyAd(), false);
  assert.equal(scheduler.canShowMultiTag(), false);
  assert.equal(scheduler.canShowNotificationAd(), false);
  assert.equal(scheduler.canRedirect(), false);
  assert.equal(scheduler.startNotificationAd().allowed, false);
  assert.equal(scheduler.startNotificationAd().reason, 'ad-free-entitlement');
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).allowed, false);
  assert.equal(scheduler.startDownloadAd('download-1').allowed, false);
  assert.equal(scheduler.markScriptInjected('monetag:246109'), false);
  assert.deepEqual(scheduler.snapshot().injectedScripts, []);
});

test('scheduler can switch between Free and Pro entitlement state', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startNotificationAd().allowed, true);
  scheduler.finishNotificationAd('done');

  scheduler.setAdEntitlements({ adFree: true });
  scheduler.setNow(() => 10 * 60 * 1000);
  assert.equal(scheduler.startNotificationAd().allowed, false);

  scheduler.setAdEntitlements({ adFree: false });
  assert.equal(scheduler.startNotificationAd().allowed, true);
});
