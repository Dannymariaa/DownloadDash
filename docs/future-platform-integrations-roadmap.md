# Future Platform Integrations Roadmap

This document is intentionally separate from the current production API. It does not implement media downloads, stream proxying, access-control bypasses, or platform protection circumvention.

## Current Boundary

The production API remains metadata-only:

- Minimum upstream requests.
- HEAD before GET.
- Capped HTML/JSON reads.
- Aggressive caching.
- No media downloads.
- No media streaming.
- No media proxying.

## Supported Future Direction

Future platform-specific integrations should use official APIs, documented oEmbed endpoints, or other supported metadata endpoints where allowed by the platform's terms.

| Platform | Supported Metadata Direction | Notes |
| --- | --- | --- |
| YouTube | YouTube Data API and oEmbed | Requires API key, quota management, and compliance with YouTube API Services Terms. |
| TikTok | TikTok developer APIs/oEmbed where available | Availability and permissions vary by region and app approval. |
| Instagram/Facebook | Meta Graph API/oEmbed where permitted | Requires app review, tokens, and strict platform compliance. |
| X | X API tiers for post metadata | Paid tiers and rate limits may apply. |
| Reddit | Reddit JSON/API endpoints | OAuth recommended for production reliability. |
| Pinterest | Pinterest API where approved | Requires app registration and permission review. |

## Architecture Required

- Per-platform provider modules behind a common metadata interface.
- Token storage and rotation with a secrets manager.
- Provider-specific quota and rate-limit tracking.
- Circuit breakers for degraded providers.
- Cache entries keyed by URL plus provider/version.
- Audit logs for provider calls.
- Terms-of-service registry documenting allowed use per provider.

## Estimated Bandwidth Impact

Official metadata APIs usually reduce HTML scraping bandwidth but may increase request count due to auth, lookup, and pagination. Expected impact:

- Lower bytes per response than HTML pages.
- More predictable JSON payloads.
- Better conditional caching where providers expose validators.
- Possible quota cost instead of proxy bandwidth cost.

## Scalability Considerations

- Use background refresh for popular cached URLs.
- Apply provider-specific request budgets.
- Store normalized metadata separately from raw provider payloads.
- Keep user-facing requests cache-first.

## Security Implications

- Protect OAuth tokens and API keys.
- Scope provider permissions narrowly.
- Avoid storing private user content.
- Continue SSRF validation even for provider URLs.
- Keep all responses metadata-only.

## Maintenance Considerations

- Provider APIs and terms change frequently.
- App reviews and API tier changes can affect availability.
- Each provider should have isolated tests and feature flags.

## Legal and Terms Considerations

Any future integration must be reviewed against each platform's developer terms, content policies, user privacy requirements, and copyright obligations. The implementation should not bypass platform access controls or enable unauthorized media retrieval.
