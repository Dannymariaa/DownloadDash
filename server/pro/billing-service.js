import crypto from 'node:crypto';
import { getAccountStore } from './account-store.js';

const activeEvents = new Set(['checkout.completed', 'subscription.created', 'invoice.payment_succeeded', 'subscription.renewed']);
const inactiveEvents = new Set(['subscription.cancelled', 'subscription.expired', 'payment.failed', 'charge.refunded']);

const timingSafeEqualString = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export function createBillingService({
  store = getAccountStore(),
  webhookSecret = process.env.DOWNLOADDASH_BILLING_WEBHOOK_SECRET || 'development-webhook-secret-change-me',
  appUrl = process.env.DOWNLOADDASH_APP_URL || process.env.VERCEL_URL || 'http://localhost:5173',
} = {}) {
  const signWebhookPayload = (payload) =>
    crypto.createHmac('sha256', webhookSecret).update(String(payload)).digest('hex');

  const verifyWebhookSignature = (payload, signature) => {
    if (!signature || !timingSafeEqualString(signature, signWebhookPayload(payload))) {
      const error = new Error('Invalid webhook signature');
      error.status = 401;
      throw error;
    }
  };

  const applyVerifiedEvent = async (event) => {
    if (!event?.id || !event?.type) throw new Error('Invalid billing event');
    if (await store.hasBillingEvent(event.id)) return { processed: false, duplicate: true };
    await store.recordBillingEvent({
      id: event.id,
      type: event.type,
      provider: event.provider || 'sandbox',
      providerSubscriptionId: event.subscriptionId || event.providerSubscriptionId || null,
      userId: event.userId || null,
      payload: event,
    });

    if (!event.userId) return { processed: true };

    if (activeEvents.has(event.type)) {
      await store.upsertSubscription({
        userId: event.userId,
        plan: 'pro',
        status: 'active',
        provider: event.provider || 'sandbox',
        providerCustomerId: event.customerId || event.providerCustomerId || null,
        providerSubscriptionId: event.subscriptionId || event.providerSubscriptionId || `sandbox_${event.userId}`,
        currentPeriodStart: event.currentPeriodStart || null,
        currentPeriodEnd: event.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(event.cancelAtPeriodEnd),
      });
      await store.setEntitlement({
        userId: event.userId,
        entitlement: 'adFree',
        active: true,
        expiresAt: event.currentPeriodEnd || null,
      });
    }

    if (inactiveEvents.has(event.type)) {
      await store.upsertSubscription({
        userId: event.userId,
        plan: 'pro',
        status: event.type === 'payment.failed' ? 'past_due' : 'cancelled',
        provider: event.provider || 'sandbox',
        providerSubscriptionId: event.subscriptionId || event.providerSubscriptionId || `sandbox_${event.userId}`,
      });
      await store.setEntitlement({
        userId: event.userId,
        entitlement: 'adFree',
        active: false,
        expiresAt: new Date().toISOString(),
      });
    }

    return { processed: true };
  };

  return {
    signWebhookPayload,
    verifyWebhookSignature,
    applyVerifiedEvent,
    async handleWebhook({ payload, signature }) {
      verifyWebhookSignature(payload, signature);
      return applyVerifiedEvent(JSON.parse(payload));
    },
    async createCheckout({ user }) {
      if (!user?.id) throw new Error('Authentication required');
      if (process.env.DOWNLOADDASH_BILLING_PROVIDER && process.env.DOWNLOADDASH_BILLING_PROVIDER !== 'sandbox') {
        throw new Error('Configured billing provider is not implemented yet');
      }
      return {
        provider: 'sandbox',
        mode: 'test',
        checkoutUrl: `${String(appUrl).replace(/\/+$/, '')}/checkout-status?mode=sandbox&status=pending`,
      };
    },
    async createPortal({ user }) {
      if (!user?.id) throw new Error('Authentication required');
      return {
        provider: 'sandbox',
        portalUrl: `${String(appUrl).replace(/\/+$/, '')}/account`,
      };
    },
  };
}

export const getBillingService = () => createBillingService();
