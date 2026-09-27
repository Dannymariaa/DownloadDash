import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { getAccountStore } from './account-store.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'dd_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const RESET_TTL_MS = 1000 * 60 * 30;
const activeSubscriptionStatuses = new Set(['active', 'trialing']);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const now = () => Date.now();
const randomId = () => crypto.randomBytes(16).toString('hex');

const timingSafeEqualString = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const sign = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url');

const encodeSessionPayload = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

const decodeSessionPayload = (payload) =>
  JSON.parse(Buffer.from(String(payload || ''), 'base64url').toString('utf8'));

const serializeCookie = (name, value, { maxAge = SESSION_TTL_MS / 1000 } = {}) => [
  `${name}=${value}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  process.env.NODE_ENV === 'production' ? 'Secure' : '',
  `Max-Age=${Math.floor(maxAge)}`,
].filter(Boolean).join('; ');

const parseCookies = (cookieHeader = '') =>
  Object.fromEntries(
    String(cookieHeader)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)];
      })
  );

const emptyAccount = () => ({
  authenticated: false,
  plan: 'free',
  entitlements: { adFree: false },
});

const publicUser = (user) => user && ({
  id: user.id,
  email: user.email,
  full_name: user.fullName || user.email,
  created_date: user.createdAt,
  emailVerified: Boolean(user.emailVerified),
});

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scrypt(String(password), salt, 64);
  return timingSafeEqualString(Buffer.from(derived).toString('base64url'), hash);
}

export function createAccountService({
  store = getAccountStore(),
  sessionSecret = process.env.DOWNLOADDASH_SESSION_SECRET || 'development-session-secret-change-me',
} = {}) {
  const createSessionCookie = async (user) => {
    const sessionId = randomId();
    const expiresAt = new Date(now() + SESSION_TTL_MS).toISOString();
    await store.createSession({ id: sessionId, userId: user.id, expiresAt });
    const payload = encodeSessionPayload({
      sid: sessionId,
      uid: user.id,
      email: user.email,
      fullName: user.fullName || user.email,
      createdAt: user.createdAt,
      emailVerified: Boolean(user.emailVerified),
      exp: new Date(expiresAt).getTime(),
    });
    const value = `v2.${payload}.${sign(payload, sessionSecret)}`;
    return serializeCookie(SESSION_COOKIE, value);
  };

  const readSession = async (cookieHeader) => {
    const value = parseCookies(cookieHeader)[SESSION_COOKIE];
    if (!value) return null;

    const [version, payload, payloadSignature] = value.split('.');
    if (version === 'v2' && payload && payloadSignature && timingSafeEqualString(payloadSignature, sign(payload, sessionSecret))) {
      try {
        const session = decodeSessionPayload(payload);
        if (!session.uid || !session.email || Number(session.exp) <= now()) return null;
        return {
          session: { id: session.sid, userId: session.uid, expiresAt: new Date(session.exp).toISOString() },
          user: {
            id: session.uid,
            email: session.email,
            fullName: session.fullName || session.email,
            createdAt: session.createdAt,
            emailVerified: Boolean(session.emailVerified),
          },
        };
      } catch {
        return null;
      }
    }

    const [sessionId, signature] = value.split('.');
    if (!sessionId || !signature || !timingSafeEqualString(signature, sign(sessionId, sessionSecret))) return null;
    const session = await store.findSessionById(sessionId);
    if (!session || new Date(session.expiresAt).getTime() <= now()) return null;
    const user = await store.findUserById(session.userId);
    if (!user) return null;
    return { session, user };
  };

  const serializeAccount = async (user) => {
    if (!user) return emptyAccount();
    const subscription = await store.getSubscriptionForUser(user.id);
    const entitlements = await store.getEntitlementsForUser(user.id);
    const entitlementMap = Object.fromEntries(
      entitlements.map((entry) => [
        entry.entitlement,
        Boolean(entry.active) && (!entry.expiresAt || new Date(entry.expiresAt).getTime() > now()),
      ])
    );
    const isPro = subscription?.plan === 'pro' && activeSubscriptionStatuses.has(subscription?.status) && entitlementMap.adFree === true;
    return {
      authenticated: true,
      id: user.id,
      email: user.email,
      full_name: user.fullName || user.email,
      created_date: user.createdAt,
      emailVerified: Boolean(user.emailVerified),
      plan: isPro ? 'pro' : 'free',
      entitlements: {
        adFree: isPro,
      },
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart || null,
        currentPeriodEnd: subscription.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
        provider: subscription.provider,
      } : null,
    };
  };

  return {
    async createUser({ email, password, fullName }) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('A valid email is required');
      if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
      return store.createUser({
        id: `usr_${randomId()}`,
        email: normalizedEmail,
        fullName: fullName || normalizedEmail,
        passwordHash: await hashPassword(password),
        emailVerified: process.env.DOWNLOADDASH_EMAIL_VERIFICATION_SUPPORTED === 'true' ? false : true,
      });
    },
    async signup(input) {
      const user = await this.createUser(input);
      return { user: publicUser(user), cookie: await createSessionCookie(user) };
    },
    async login({ email, password }) {
      const user = await store.findUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
      }
      return { user: publicUser(user), cookie: await createSessionCookie(user) };
    },
    async logout(cookieHeader) {
      const value = parseCookies(cookieHeader)[SESSION_COOKIE];
      const parts = value?.split('.') || [];
      let sessionId = parts[0];
      if (parts[0] === 'v2' && parts[1]) {
        try {
          sessionId = decodeSessionPayload(parts[1]).sid;
        } catch {
          sessionId = null;
        }
      }
      if (sessionId) await store.deleteSession(sessionId);
      return serializeCookie(SESSION_COOKIE, '', { maxAge: 0 });
    },
    async getAccountFromCookie(cookieHeader, _clientState = {}) {
      const session = await readSession(cookieHeader);
      return serializeAccount(session?.user || null);
    },
    async requireUser(cookieHeader) {
      const session = await readSession(cookieHeader);
      if (!session?.user) {
        const error = new Error('Authentication required');
        error.status = 401;
        throw error;
      }
      return session.user;
    },
    async requestPasswordReset({ email }) {
      const user = await store.findUserByEmail(email);
      if (!user) return { ok: true };
      const token = randomId();
      await store.createPasswordResetToken({
        token,
        userId: user.id,
        expiresAt: new Date(now() + RESET_TTL_MS).toISOString(),
      });
      return {
        ok: true,
        resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
      };
    },
    async resetPassword({ token, password }) {
      if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
      const reset = await store.findPasswordResetToken(token);
      if (!reset || reset.usedAt || new Date(reset.expiresAt).getTime() <= now()) {
        const error = new Error('Reset link is invalid or expired');
        error.status = 400;
        throw error;
      }
      await store.updateUser(reset.userId, { passwordHash: await hashPassword(password) });
      await store.markPasswordResetUsed(token);
      return { ok: true };
    },
  };
}

export const getAccountService = () => createAccountService();
