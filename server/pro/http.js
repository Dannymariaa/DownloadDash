export const json = (res, status, body, headers = {}) => {
  res.statusCode = status;
  Object.entries({
    'Content-Type': 'application/json',
    ...headers,
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
};

export const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  return JSON.parse(text);
};

export const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

export const methodNotAllowed = (res) => json(res, 405, { error: 'method_not_allowed' });

export const getCookieHeader = (req) => req.headers.cookie || '';
