import fs from 'node:fs/promises';
import path from 'node:path';

const nowIso = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const emptyState = () => ({
  users: [],
  subscriptions: [],
  entitlements: [],
  sessions: [],
  passwordResetTokens: [],
  billingEvents: [],
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export function createMemoryStore(initialState = emptyState()) {
  const state = clone(initialState);

  return {
    async findUserByEmail(email) {
      return clone(state.users.find((user) => user.email === normalizeEmail(email)) || null);
    },
    async findUserById(id) {
      return clone(state.users.find((user) => user.id === id) || null);
    },
    async createUser(user) {
      const email = normalizeEmail(user.email);
      if (state.users.some((entry) => entry.email === email)) {
        const error = new Error('Email is already registered');
        error.code = 'email_exists';
        throw error;
      }
      const created = {
        ...user,
        email,
        emailVerified: Boolean(user.emailVerified),
        createdAt: user.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      state.users.push(created);
      return clone(created);
    },
    async updateUser(id, updates) {
      const index = state.users.findIndex((user) => user.id === id);
      if (index === -1) return null;
      state.users[index] = { ...state.users[index], ...updates, updatedAt: nowIso() };
      return clone(state.users[index]);
    },
    async createSession(session) {
      state.sessions.push({ ...session, createdAt: nowIso() });
      return clone(session);
    },
    async findSessionById(id) {
      return clone(state.sessions.find((session) => session.id === id) || null);
    },
    async deleteSession(id) {
      const before = state.sessions.length;
      state.sessions = state.sessions.filter((session) => session.id !== id);
      return state.sessions.length !== before;
    },
    async createPasswordResetToken(token) {
      state.passwordResetTokens.push({ ...token, createdAt: nowIso(), usedAt: null });
      return clone(token);
    },
    async findPasswordResetToken(token) {
      return clone(state.passwordResetTokens.find((entry) => entry.token === token) || null);
    },
    async markPasswordResetUsed(token) {
      const entry = state.passwordResetTokens.find((item) => item.token === token);
      if (entry) entry.usedAt = nowIso();
      return clone(entry || null);
    },
    async getSubscriptionForUser(userId) {
      const matches = state.subscriptions.filter((subscription) => subscription.userId === userId);
      return clone(matches.at(-1) || null);
    },
    async upsertSubscription(subscription) {
      const key = subscription.providerSubscriptionId || subscription.userId;
      const index = state.subscriptions.findIndex((entry) =>
        (subscription.providerSubscriptionId && entry.providerSubscriptionId === subscription.providerSubscriptionId) ||
        (!subscription.providerSubscriptionId && entry.userId === subscription.userId)
      );
      const next = {
        id: key,
        plan: 'free',
        status: 'inactive',
        provider: 'sandbox',
        providerCustomerId: null,
        providerSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: nowIso(),
        ...subscription,
        updatedAt: nowIso(),
      };
      if (index === -1) state.subscriptions.push(next);
      else state.subscriptions[index] = { ...state.subscriptions[index], ...next, createdAt: state.subscriptions[index].createdAt };
      return clone(index === -1 ? next : state.subscriptions[index]);
    },
    async getEntitlementsForUser(userId) {
      return clone(state.entitlements.filter((entry) => entry.userId === userId));
    },
    async setEntitlement(entitlement) {
      const index = state.entitlements.findIndex((entry) =>
        entry.userId === entitlement.userId && entry.entitlement === entitlement.entitlement
      );
      const next = {
        active: false,
        expiresAt: null,
        createdAt: nowIso(),
        ...entitlement,
        updatedAt: nowIso(),
      };
      if (index === -1) state.entitlements.push(next);
      else state.entitlements[index] = { ...state.entitlements[index], ...next, createdAt: state.entitlements[index].createdAt };
      return clone(index === -1 ? next : state.entitlements[index]);
    },
    async hasBillingEvent(id) {
      return state.billingEvents.some((event) => event.id === id);
    },
    async recordBillingEvent(event) {
      if (state.billingEvents.some((entry) => entry.id === event.id)) return null;
      const created = { ...event, createdAt: nowIso() };
      state.billingEvents.push(created);
      return clone(created);
    },
    async listBillingEvents() {
      return clone(state.billingEvents);
    },
    snapshot() {
      return clone(state);
    },
  };
}

export function createJsonFileStore(filePath = process.env.DOWNLOADDASH_ACCOUNT_DB_PATH || path.join(process.cwd(), '.data', 'accounts.json')) {
  let memoryStorePromise;
  const load = async () => {
    if (memoryStorePromise) return memoryStorePromise;
    memoryStorePromise = (async () => {
      try {
        const text = await fs.readFile(filePath, 'utf8');
        return createMemoryStore(JSON.parse(text));
      } catch {
        return createMemoryStore();
      }
    })();
    return memoryStorePromise;
  };
  const persist = async (store) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(store.snapshot(), null, 2));
  };
  const wrap = (method) => async (...args) => {
    const store = await load();
    const result = await store[method](...args);
    if (!['findUserByEmail', 'findUserById', 'findSessionById', 'findPasswordResetToken', 'getSubscriptionForUser', 'getEntitlementsForUser', 'hasBillingEvent', 'listBillingEvents', 'snapshot'].includes(method)) {
      await persist(store);
    }
    return result;
  };
  const methods = Object.keys(createMemoryStore());
  return Object.fromEntries(methods.map((method) => [method, method === 'snapshot' ? async () => (await load()).snapshot() : wrap(method)]));
}

let defaultStore;
export const getAccountStore = () => {
  if (!defaultStore) defaultStore = createJsonFileStore();
  return defaultStore;
};
