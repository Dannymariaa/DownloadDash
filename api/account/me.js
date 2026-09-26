import { getAccountService } from '../../server/pro/account-service.js';
import { getCookieHeader, json, methodNotAllowed } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const account = await getAccountService().getAccountFromCookie(getCookieHeader(req));
  return json(res, 200, account);
}
