import { getAccountService } from '../../server/pro/account-service.js';
import { getBillingService } from '../../server/pro/billing-service.js';
import { getCookieHeader, json, methodNotAllowed, readRawBody } from '../../server/pro/http.js';

const routePath = (req) => {
  const queryPath = req.query?.path || req.query?.['...path'];
  const parts = (Array.isArray(queryPath) ? queryPath : queryPath ? [queryPath] : [])
    .flatMap((part) => String(part).split('/'))
    .filter(Boolean);

  if (parts.length) return parts.join('/');

  const parsed = new URL(req.url || '/', 'https://downloaddash.local');
  const match = parsed.pathname.match(/^\/api\/billing\/?(.*)$/);
  return match?.[1]?.replace(/^\/+|\/+$/g, '') || '';
};

export default async function handler(req, res) {
  const path = routePath(req);

  if (path === 'checkout') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      const user = await getAccountService().requireUser(getCookieHeader(req));
      return json(res, 200, await getBillingService().createCheckout({ user }));
    } catch (error) {
      return json(res, error.status || 400, { error: 'checkout_failed', message: error.message });
    }
  }

  if (path === 'portal') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      const user = await getAccountService().requireUser(getCookieHeader(req));
      return json(res, 200, await getBillingService().createPortal({ user }));
    } catch (error) {
      return json(res, error.status || 400, { error: 'portal_failed', message: error.message });
    }
  }

  if (path === 'webhook') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      const payload = await readRawBody(req);
      const signature = req.headers['x-downloaddash-signature'];
      return json(res, 200, await getBillingService().handleWebhook({ payload, signature }));
    } catch (error) {
      return json(res, error.status || 400, { error: 'webhook_rejected', message: error.message });
    }
  }

  return json(res, 404, { error: 'not_found' });
}
