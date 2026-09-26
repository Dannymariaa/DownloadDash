import { getAccountService } from '../../server/pro/account-service.js';
import { json, methodNotAllowed, readJsonBody } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const result = await getAccountService().login(await readJsonBody(req));
    res.setHeader('Set-Cookie', result.cookie);
    return json(res, 200, { user: result.user });
  } catch (error) {
    return json(res, error.status || 400, { error: 'login_failed', message: error.message });
  }
}
