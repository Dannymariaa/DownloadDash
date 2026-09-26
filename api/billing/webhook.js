import { getBillingService } from '../../server/pro/billing-service.js';
import { json, methodNotAllowed, readRawBody } from '../../server/pro/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const payload = await readRawBody(req);
    const signature = req.headers['x-downloaddash-signature'];
    return json(res, 200, await getBillingService().handleWebhook({ payload, signature }));
  } catch (error) {
    return json(res, error.status || 400, { error: 'webhook_rejected', message: error.message });
  }
}
