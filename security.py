import ipaddress
import socket
from urllib.parse import urlparse

from config import Config


class SecurityValidationError(ValueError):
    """Raised when a URL fails outbound request security checks."""


def _is_blocked_ip(value):
    ip = ipaddress.ip_address(value)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _resolve_host(hostname):
    try:
        return {
            item[4][0]
            for item in socket.getaddrinfo(
                hostname,
                None,
                proto=socket.IPPROTO_TCP,
            )
        }
    except socket.gaierror as exc:
        raise SecurityValidationError("URL hostname could not be resolved.") from exc


def validate_public_url(url):
    if not isinstance(url, str):
        raise SecurityValidationError("URL must be a string.")

    value = url.strip()
    if not value or len(value) > Config.MAX_URL_LENGTH:
        raise SecurityValidationError("URL is missing or too long.")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise SecurityValidationError("URL contains invalid control characters.")

    parsed = urlparse(value)
    if parsed.scheme not in Config.ALLOWED_SCHEMES:
        raise SecurityValidationError("Only http and https URLs are supported.")
    if not parsed.hostname:
        raise SecurityValidationError("URL hostname is missing.")
    if parsed.username or parsed.password:
        raise SecurityValidationError("URL credentials are not allowed.")

    try:
        _ = parsed.port
    except ValueError as exc:
        raise SecurityValidationError("URL port is invalid.") from exc

    hostname = parsed.hostname.rstrip(".").lower()
    try:
        hostname.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise SecurityValidationError("URL hostname contains invalid Unicode.") from exc

    if hostname in Config.BLOCKED_HOSTNAMES or hostname.endswith(".localhost"):
        raise SecurityValidationError("Local hostnames are not allowed.")

    try:
        if _is_blocked_ip(hostname):
            raise SecurityValidationError("Internal IP addresses are not allowed.")
    except ValueError:
        for address in _resolve_host(hostname):
            if _is_blocked_ip(address):
                raise SecurityValidationError("URL resolves to an internal address.") from None

    return value
