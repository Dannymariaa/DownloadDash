import { getAccountService } from '../../server/pro/account-service.js';
import { json, methodNotAllowed, readJsonBody } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const result = await getAccountService().signup(await readJsonBody(req));
    res.setHeader('Set-Cookie', result.cookie);
    return json(res, 201, { user: result.user });
  } catch (error) {
    return json(res, error.status || 400, { error: error.code || 'signup_failed', message: error.message });
  }
}
