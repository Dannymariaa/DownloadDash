import { publicError } from "./errors.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const buckets = new Map();

function clientId(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
}

export function enforceRateLimit(req) {
  const now = Date.now();
  const key = clientId(req);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    throw publicError("UPSTREAM_RATE_LIMITED", 429, `rate limit exceeded for ${key}`);
  }
}
