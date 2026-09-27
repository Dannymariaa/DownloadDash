import { getAccountService } from '../../server/pro/account-service.js';
import { getCookieHeader, json, methodNotAllowed, readJsonBody } from '../../server/pro/http.js';

const routePath = (req) => {
  const queryPath = req.query?.path || req.query?.['...path'];
  const parts = (Array.isArray(queryPath) ? queryPath : queryPath ? [queryPath] : [])
    .flatMap((part) => String(part).split('/'))
    .filter(Boolean);

  if (parts.length) return parts.join('/');

  const parsed = new URL(req.url || '/', 'https://downloaddash.local');
  const match = parsed.pathname.match(/^\/api\/account\/?(.*)$/);
  return match?.[1]?.replace(/^\/+|\/+$/g, '') || '';
};

export default async function handler(req, res) {
  const path = routePath(req);
  const accountService = getAccountService();

  if (path === 'me') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    const account = await accountService.getAccountFromCookie(getCookieHeader(req));
    return json(res, 200, account);
  }

  if (path === 'signup') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      const result = await accountService.signup(await readJsonBody(req));
      res.setHeader('Set-Cookie', result.cookie);
      return json(res, 201, { user: result.user });
    } catch (error) {
      return json(res, error.status || 400, { error: error.code || 'signup_failed', message: error.message });
    }
  }

  if (path === 'login') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      const result = await accountService.login(await readJsonBody(req));
      res.setHeader('Set-Cookie', result.cookie);
      return json(res, 200, { user: result.user });
    } catch (error) {
      return json(res, error.status || 400, { error: 'login_failed', message: error.message });
    }
  }

  if (path === 'logout') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    const cookie = await accountService.logout(getCookieHeader(req));
    res.setHeader('Set-Cookie', cookie);
    return json(res, 200, { ok: true });
  }

  if (path === 'forgot-password') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      return json(res, 200, await accountService.requestPasswordReset(await readJsonBody(req)));
    } catch (error) {
      return json(res, error.status || 400, { error: 'forgot_password_failed', message: error.message });
    }
  }

  if (path === 'reset-password') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      return json(res, 200, await accountService.resetPassword(await readJsonBody(req)));
    } catch (error) {
      return json(res, error.status || 400, { error: 'reset_password_failed', message: error.message });
    }
  }

  return json(res, 404, { error: 'not_found' });
}
