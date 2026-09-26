import { getAccountService } from '../../server/pro/account-service.js';
import { getCookieHeader, json, methodNotAllowed } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const cookie = await getAccountService().logout(getCookieHeader(req));
  res.setHeader('Set-Cookie', cookie);
  return json(res, 200, { ok: true });
}
