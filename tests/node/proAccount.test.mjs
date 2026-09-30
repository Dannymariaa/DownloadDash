import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { createAccountService } from '../../server/pro/account-service.js';
import { createMemoryStore, defaultAccountStorePath } from '../../server/pro/account-store.js';
import { createBillingService } from '../../server/pro/billing-service.js';

test('Vercel account store default uses writable tmp storage', () => {
  const originalVercel = process.env.VERCEL;
  const originalDbPath = process.env.DOWNLOADDASH_ACCOUNT_DB_PATH;

  try {
    process.env.VERCEL = '1';
    delete process.env.DOWNLOADDASH_ACCOUNT_DB_PATH;

    assert.match(defaultAccountStorePath(), /^\/tmp\/downloaddash\/accounts\.json$/);
  } finally {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalDbPath === undefined) delete process.env.DOWNLOADDASH_ACCOUNT_DB_PATH;
    else process.env.DOWNLOADDASH_ACCOUNT_DB_PATH = originalDbPath;
  }
});

test('logged-out user receives safe Free account response', async () => {
  const service = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });

  const account = await service.getAccountFromCookie('');

  assert.deepEqual(account, {
    authenticated: false,
    plan: 'free',
    entitlements: { adFree: false },
  });
});

test('browser cannot fake Pro by sending client state', async () => {
  const service = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });

  const account = await service.getAccountFromCookie('', { isPro: true, plan: 'pro' });

  assert.equal(account.authenticated, false);
  assert.equal(account.plan, 'free');
  assert.equal(account.entitlements.adFree, false);
});

test('session cookies keep HttpOnly and SameSite while Secure follows environment', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    const localService = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });
    await localService.createUser({ email: 'local@example.com', password: 'Correct Horse 123' });
    const localLogin = await localService.login({ email: 'local@example.com', password: 'Correct Horse 123' });

    assert.match(localLogin.cookie, /HttpOnly/);
    assert.match(localLogin.cookie, /SameSite=Lax/);
    assert.doesNotMatch(localLogin.cookie, /;\s*Secure(?:;|$)/);

    process.env.NODE_ENV = 'production';
    const productionService = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });
    await productionService.createUser({ email: 'prod@example.com', password: 'Correct Horse 123' });
    const productionLogin = await productionService.login({ email: 'prod@example.com', password: 'Correct Horse 123' });

    assert.match(productionLogin.cookie, /HttpOnly/);
    assert.match(productionLogin.cookie, /SameSite=Lax/);
    assert.match(productionLogin.cookie, /;\s*Secure(?:;|$)/);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('signed session cookie authenticates across isolated serverless stores', async () => {
  const signupService = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });
  const { cookie } = await signupService.signup({ email: 'isolated@example.com', password: 'Correct Horse 123' });
  const isolatedService = createAccountService({ store: createMemoryStore(), sessionSecret: 'test-secret' });

  const user = await isolatedService.requireUser(cookie);

  assert.equal(user.email, 'isolated@example.com');
  assert.equal(user.fullName, 'isolated@example.com');
});

test('verified active subscription enables Pro ad-free entitlement', async () => {
  const store = createMemoryStore();
  const service = createAccountService({ store, sessionSecret: 'test-secret' });
  const user = await service.createUser({ email: 'pro@example.com', password: 'Correct Horse 123' });

  await store.upsertSubscription({
    userId: user.id,
    plan: 'pro',
    status: 'active',
    provider: 'sandbox',
    providerCustomerId: 'cus_test',
    providerSubscriptionId: 'sub_test',
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
  });
  await store.setEntitlement({
    userId: user.id,
    entitlement: 'adFree',
    active: true,
    expiresAt: '2026-10-01T00:00:00.000Z',
  });

  const { cookie } = await service.login({ email: 'pro@example.com', password: 'Correct Horse 123' });
  const account = await service.getAccountFromCookie(cookie, { isPro: false });

  assert.equal(account.authenticated, true);
  assert.equal(account.email, 'pro@example.com');
  assert.equal(account.plan, 'pro');
  assert.equal(account.entitlements.adFree, true);
  assert.equal(account.subscription.status, 'active');
});

test('cancelled subscription removes Pro entitlement', async () => {
  const store = createMemoryStore();
  const accountService = createAccountService({ store, sessionSecret: 'test-secret' });
  const billing = createBillingService({ store, webhookSecret: 'webhook-secret' });
  const user = await accountService.createUser({ email: 'cancelled@example.com', password: 'Correct Horse 123' });

  await store.upsertSubscription({
    userId: user.id,
    plan: 'pro',
    status: 'active',
    provider: 'sandbox',
    providerSubscriptionId: 'sub_cancel',
  });
  await store.setEntitlement({ userId: user.id, entitlement: 'adFree', active: true });

  const result = await billing.applyVerifiedEvent({
    id: 'evt_cancel',
    type: 'subscription.cancelled',
    userId: user.id,
    subscriptionId: 'sub_cancel',
  });
  const { cookie } = await accountService.login({ email: 'cancelled@example.com', password: 'Correct Horse 123' });
  const account = await accountService.getAccountFromCookie(cookie);

  assert.equal(result.processed, true);
  assert.equal(account.plan, 'free');
  assert.equal(account.entitlements.adFree, false);
  assert.equal(account.subscription.status, 'cancelled');
});

test('forged webhook is rejected before subscription changes', async () => {
  const store = createMemoryStore();
  const billing = createBillingService({ store, webhookSecret: 'webhook-secret' });
  const payload = JSON.stringify({ id: 'evt_bad', type: 'checkout.completed' });

  await assert.rejects(
    () => billing.handleWebhook({ payload, signature: 'bad-signature' }),
    /Invalid webhook signature/
  );
  assert.equal((await store.listBillingEvents()).length, 0);
});

test('duplicate webhook is idempotent', async () => {
  const store = createMemoryStore();
  const accountService = createAccountService({ store, sessionSecret: 'test-secret' });
  const billing = createBillingService({ store, webhookSecret: 'webhook-secret' });
  const user = await accountService.createUser({ email: 'dupe@example.com', password: 'Correct Horse 123' });
  const payload = JSON.stringify({
    id: 'evt_dupe',
    type: 'checkout.completed',
    userId: user.id,
    customerId: 'cus_dupe',
    subscriptionId: 'sub_dupe',
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  });
  const signature = billing.signWebhookPayload(payload);

  const first = await billing.handleWebhook({ payload, signature });
  const second = await billing.handleWebhook({ payload, signature });

  assert.equal(first.processed, true);
  assert.equal(second.processed, false);
  assert.equal(second.duplicate, true);
  assert.equal((await store.listBillingEvents()).length, 1);
});

test('sandbox checkout normalizes host-only Vercel app URLs to HTTPS', async () => {
  const billing = createBillingService({ store: createMemoryStore(), appUrl: 'preview.example.vercel.app' });

  const checkout = await billing.createCheckout({ user: { id: 'usr_checkout' } });

  assert.equal(checkout.checkoutUrl, 'https://preview.example.vercel.app/checkout-status?mode=sandbox&status=pending');
});

test('sandbox checkout preserves valid http and https application origins', async () => {
  const productionBilling = createBillingService({
    store: createMemoryStore(),
    appUrl: 'https://www.downloaddash.store',
  });
  const localBilling = createBillingService({
    store: createMemoryStore(),
    appUrl: 'http://localhost:5173',
  });

  const productionCheckout = await productionBilling.createCheckout({ user: { id: 'usr_prod' } });
  const localPortal = await localBilling.createPortal({ user: { id: 'usr_local' } });

  assert.equal(
    productionCheckout.checkoutUrl,
    'https://www.downloaddash.store/checkout-status?mode=sandbox&status=pending'
  );
  assert.equal(localPortal.portalUrl, 'http://localhost:5173/account');
});

test('billing rejects unsafe application URLs before creating redirects', async () => {
  for (const appUrl of ['javascript:alert(1)', 'ftp://www.downloaddash.store', 'https://www.downloaddash.store/path']) {
    assert.throws(
      () => createBillingService({ store: createMemoryStore(), appUrl }),
      /Invalid application URL/,
      appUrl
    );
  }
});

test('download results Pro promo states batch download benefits', async () => {
  const source = await readFile(new URL('../../src/components/DownloaderTemplate.jsx', import.meta.url), 'utf8');

  assert.match(source, /Ad-free downloads/);
  assert.match(source, /No countdown/);
  assert.match(source, /Up to 7 public links at once/);
  assert.match(source, /Mixed-platform batches/);
  assert.match(source, /Batch download manager/);
  assert.match(source, /Saved quality preferences/);
});

test('download results place the Free Pro promo before download options with no duplicate lower promo', async () => {
  const source = await readFile(new URL('../../src/components/DownloaderTemplate.jsx', import.meta.url), 'utf8');
  const resultSection = source.slice(source.indexOf('{result && ('));

  assert.equal([...source.matchAll(/DownloadDash Pro/g)].length, 1);
  assert.ok(resultSection.indexOf('DownloadDash Pro') < resultSection.indexOf("{t('downloader.hdDownload')}"));
  assert.ok(resultSection.indexOf('DownloadDash Pro') < resultSection.indexOf('downloader.photoDownload'));
  assert.ok(resultSection.indexOf('DownloadDash Pro') < resultSection.indexOf("{t('downloader.audioDownload')}"));
});

test('gallery result UI counts only canonical photos and keeps soundtrack separate', async () => {
  const source = await readFile(new URL('../../src/components/DownloaderTemplate.jsx', import.meta.url), 'utf8');

  assert.match(source, /const selectableMediaItems = canonicalMediaItems/);
  assert.match(source, /\{selectedMediaItems\.length\} of \{selectableMediaItems\.length\} selected/);
  assert.match(source, /audioItems\.length > 0 \? audioItems : null/);
  assert.match(source, /extensionFromMediaItem\(item\)/);
  assert.match(source, /requestDownload\(item\.url, 'image', `Download Image \$\{index \+ 1\}`, \[item\]\)/);
  assert.match(source, /Download selected/);
  assert.match(source, /Download all/);
  assert.doesNotMatch(source, /JSZip|\.zip\(/);
});

test('Pro batch UI labels batch submission and preference persistence truthfully', async () => {
  const source = await readFile(new URL('../../src/components/DownloaderTemplate.jsx', import.meta.url), 'utf8');

  assert.match(source, /Process All/);
  assert.match(source, /Saved on this browser/);
  assert.match(source, /Always when source contains audio/);
  assert.match(source, /autoSelectSoundtrack \|\| item\.type !== 'audio'/);
  assert.doesNotMatch(source, /account-saved|saved to your account/i);
});
