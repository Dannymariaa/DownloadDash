import { getAccountService } from '../../server/pro/account-service.js';
import { getBillingService } from '../../server/pro/billing-service.js';
import { getCookieHeader, json, methodNotAllowed } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const user = await getAccountService().requireUser(getCookieHeader(req));
    return json(res, 200, await getBillingService().createCheckout({ user }));
  } catch (error) {
    return json(res, error.status || 400, { error: 'checkout_failed', message: error.message });
  }
}
