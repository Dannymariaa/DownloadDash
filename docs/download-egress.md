# Public resolver egress

Public requests resolve directly first. The existing bounded resolver and
single-flight run before any residential fallback. A successful public result
is cached for up to 240 seconds, shortened to ten seconds before recognized
`expire`, `expires`, `x-expires`, or Facebook/Instagram `oe` URL timestamps. Authenticated requests are
excluded from shared caches and proxy fallback. Cached format data strips
cookies, authorization headers, session fields and proxy settings.

Only public egress rejection, network failure, or a completed provider timeout
is eligible for one anonymous proxy metadata extraction. Login, cookies,
private/paid media, challenges, missing media, invalid URLs and rate limits
never qualify. A request that has exhausted its overall deadline cannot start
a new proxy attempt. YouTube uses installed yt-dlp defaults; Reddit post/gallery
fallback uses the public JSON endpoint and preserves gallery item order.

The fallback uses one pooled HTTP client for its extraction cycle, with TLS
verification and environment proxies disabled. It follows validated public-host
redirects without reading redirect HTML, loads no login cookies, does not retry
extractors, and rejects known media URLs, manifests and media response MIME types before
consuming their bodies. Media assembly, gallery downloads, and signed Render
file streaming use direct egress, even if a proxy is configured. CDN rejection
remains an error; it does not authorize a proxy video transfer.

## Accounting

Response timing includes `proxyRequestCount`, `proxyUploadBytes`,
`proxyDownloadBytes`, `proxyTotalBytes`, `proxyFallbackReason`, `proxyCacheHit`
and `route`. Byte counters measure HTTP body payloads (compressed download
bytes), **not headers, CONNECT, TLS, TCP overhead, transport framing or vendor billing**. A failed
connection or rejected media response may have zero body bytes but a nonzero
request count. Cache hits and single-flight followers report zero additional
proxy bytes. Only the operation owner reports its cost.

Error responses stop after the 8 KiB decoded preview used for classification.
Measured encoded bytes can exceed that preview because of transport buffering;
the counters retain that actual consumption. Successful metadata has no such
budget cap, and classification never required the rest of an error page.

Provider diagnostics expose worker-local recent successes/failures and a small
circuit breaker. Proxy authentication/quota/connect failures open it for 60
seconds; two consecutive other infrastructure failures also open it. Direct resolution
is still tried while open, and every later request remains direct-first.
Health, counters, single-flight and metadata cache are worker-local; the
existing private resolved-format disk cache is shared by workers on one host.

`probe_media=true` on existing provider diagnostics samples at most one cached
video and one audio CDN URL directly. It requests 1 KB with Range and closes
the stream even if Range is ignored. It does not trigger extraction or proxy
fallback. CDN phase/status is separate from resolver success; 200 metadata is
not proof that a file is downloadable.

Run `python scripts/benchmark_proxy_budget.py` from the API directory for a
mocked metering benchmark. 1 GiB divided by 10/20/50/100 KiB gives approximately
104,857/52,428/20,971/10,485 resolutions respectively, **before vendor overhead**.
These are planning examples, not guaranteed provider counts or hard byte caps.

The legacy `PLATFORM_BLOCKED_PROXY` code means upstream access was rejected; it
does not prove a proxy was used. Consult `route` and request counters for actual
egress. Provider/content restrictions do not trip the infrastructure breaker.
