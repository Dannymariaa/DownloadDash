"""Scoped browser authorization for the Vercel-to-Render file handoff."""
import hashlib
import hmac
import re
import time

from fastapi import Request


def valid_download_ticket(request: Request, secret: str | None) -> bool:
    if not secret or request.method != 'GET' or request.url.path != '/youtube/file':
        return False
    params = request.query_params
    required = {'url', 'variant', 'expires', 'signature'}
    if set(params) != required or any(len(params.getlist(key)) != 1 for key in required):
        return False
    expires = params['expires']
    signature = params['signature']
    if not re.fullmatch(r'\d{10}', expires) or not re.fullmatch(r'[a-f0-9]{64}', signature):
        return False
    remaining = int(expires) - int(time.time())
    if not 0 < remaining <= 300 or params['variant'] not in {'hd', 'sd', 'audio'}:
        return False
    if len(params['url']) > 2048:
        return False
    message = '\n'.join(['v1', 'GET', '/youtube/file', expires, params['url'], params['variant']])
    expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
