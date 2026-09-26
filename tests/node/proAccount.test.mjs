import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAccountService } from '../../server/pro/account-service.js';
import { createMemoryStore } from '../../server/pro/account-store.js';
import { createBillingService } from '../../server/pro/billing-service.js';

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
