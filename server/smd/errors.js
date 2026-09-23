export class SmdError extends Error {
  constructor(code, message, status = 500, logMessage = "") {
    super(message);
    this.name = "SmdError";
    this.code = code;
    this.status = status;
    this.logMessage = logMessage || message;
  }
}

export const ERROR_MESSAGES = {
  INVALID_JSON: "Invalid JSON request body.",
  URL_REQUIRED: "A URL is required.",
  INVALID_URL: "Enter a valid URL.",
  UNSUPPORTED_PROTOCOL: "Only HTTP and HTTPS URLs are supported.",
  UNSUPPORTED_DOMAIN: "This URL does not match the selected platform.",
  UNSUPPORTED_PLATFORM: "Downloader platform is not supported.",
  BLOCKED_HOST: "This URL is not allowed.",
  PAYLOAD_TOO_LARGE: "Request body is too large.",
  SERVICE_CONFIGURATION_ERROR: "Download service is temporarily unavailable.",
  UPSTREAM_TIMEOUT: "Download service timed out. Please try again.",
  UPSTREAM_UNAVAILABLE: "Download service is temporarily unavailable.",
  UPSTREAM_AUTH_FAILED: "Download service is temporarily unavailable.",
  UPSTREAM_PROXY_FAILED: "Download service is temporarily unavailable.",
  UPSTREAM_ROUTE_NOT_FOUND: "Download service is temporarily unavailable.",
  UPSTREAM_RATE_LIMITED: "Too many requests. Please try again later.",
  UPSTREAM_INVALID_RESPONSE: "Download service returned an invalid response.",
  PROXY_AUTH_FAILED: "Download service is temporarily unavailable.",
  PROXY_QUOTA_EXHAUSTED: "Download service is temporarily unavailable.",
  PROXY_UNREACHABLE: "Download service is temporarily unavailable.",
  PLATFORM_BLOCKED_PROXY: "Download service is temporarily unavailable.",
  PROXY_BLOCKED: "Download service is temporarily unavailable.",
  COOKIE_REQUIRED: "This media requires a valid platform session to access.",
  COOKIE_EXPIRED: "This media requires a fresh platform session to access.",
  LOGIN_REQUIRED: "This media requires a valid platform session to access.",
  ANTI_BOT_CHALLENGE: "This media is blocked by a platform security challenge.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  EXTRACTOR_OUTDATED: "Download service could not resolve this media.",
  EXTRACTOR_FAILED: "Download service could not resolve this media.",
  MEDIA_NOT_FOUND: "Media was not found or is no longer available.",
  PRIVATE_MEDIA: "This media is private, restricted, or unavailable.",
  UNSUPPORTED_MEDIA: "This media is not supported for download.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export function publicError(code, status, logMessage = "") {
  return new SmdError(code, ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR, status, logMessage);
}

export function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function sendError(res, error, requestId) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const code = error?.code || "INTERNAL_ERROR";
  const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR;

  return json(res, status, {
    success: false,
    error: {
      code,
      message,
    },
    requestId,
  });
}
