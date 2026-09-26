import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_FORMATS,
  AD_NETWORKS,
  createAdScheduler,
  isSafeAdDestination,
} from '../../src/lib/adScheduler.js';

test('MultiTag cannot run twice inside 5 minutes', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
  }).allowed, true);
  scheduler.finishActiveAd('done');

  scheduler.setNow(() => 2 * 60 * 1000);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
  }).allowed, false);

  scheduler.setNow(() => 5 * 60 * 1000);
  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.MULTITAG,
  }).allowed, true);
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

test('Adsterra and Monetag cannot launch simultaneously', () => {
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

test('only one redirect or popunder is allowed per page load', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUNDER,
  }).allowed, true);
  scheduler.finishActiveAd('closed');

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
  }).allowed, true);
  scheduler.finishActiveAd('closed');
  scheduler.noteSpaNavigation('/next-page');

  scheduler.setNow(() => 10 * 60 * 1000);
  assert.equal(scheduler.canRedirect(), false);
});

test('full reload creates a new page-instance redirect allowance', () => {
  const scheduler = createAdScheduler({ now: () => 0 });

  assert.equal(scheduler.startInterruptiveAd({
    network: AD_NETWORKS.MONETAG,
    format: AD_FORMATS.POPUP,
  }).allowed, true);
  assert.equal(scheduler.canRedirect(), false);

  const freshPageScheduler = createAdScheduler({ now: () => 0 });
  assert.equal(freshPageScheduler.canRedirect(), true);
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
  assert.equal(decision.reason, 'unsafe-destination');
});

test('javascript and data ad URLs are rejected', () => {
  assert.equal(isSafeAdDestination('javascript:alert(1)').safe, false);
  assert.equal(isSafeAdDestination('data:text/html;base64,PGgxPkFkPC9oMT4=').safe, false);
  assert.equal(isSafeAdDestination('https://ads.example/path').safe, true);
});
