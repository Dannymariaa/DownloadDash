import { getAccountService } from '../../server/pro/account-service.js';
import { json, methodNotAllowed, readJsonBody } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    return json(res, 200, await getAccountService().requestPasswordReset(await readJsonBody(req)));
  } catch (error) {
    return json(res, error.status || 400, { error: 'forgot_password_failed', message: error.message });
  }
}
