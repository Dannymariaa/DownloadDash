# SMD performance update

**Recorded:** 2026-09-30  
**Performance implementation:** `0723a57` (`perf(smd): bound resolver latency and stream media`)

## Architecture and defaults

- Metadata resolution has a 15-second deadline and a separate concurrency limit of 4.
- Managed heavy media transfers use a separate concurrency limit of 1. Metadata requests do not wait for heavy transfer slots.
- Gallery metadata fallback is limited to 5 seconds and does not run after a provider timeout.
- Public metadata cache TTL is 120 seconds. Authenticated requests bypass cache and single-flight; identical public in-flight requests share one provider call.
- Provider timeout is classified as `PROVIDER_TIMEOUT` and returned through the Vercel proxy as HTTP 504. The proxy allows at most one transient retry.
- Generic Vercel file delivery streams with backpressure. YouTube file delivery continues to redirect to Render.
- The Pro batch route remains capped at 7 URLs and uses at most 3 concurrent metadata resolutions.

All backend defaults use the existing `SMD_` environment prefix.

## Synthetic load results

Mocked identical public requests made one provider call at each tested concurrency. At 1,000 callers, latency was P50 91ms, P95 95ms, and P99 95ms; peak traced memory was 1.99MB and measured CPU time was 0.188s.

For 100 unique mocked URLs, the maximum simultaneous provider calls was 4, matching the configured resolver limit. There were no failures; elapsed time was 0.416s. Queue depth was not separately instrumented.

## Production smoke

Requests ran through the production Vercel SMD proxy after deployment. Successful results stayed below 20 seconds in this small sample. Cache hits generally returned in 24–90ms. TikTok samples had already been warmed during an interrupted initial smoke attempt, so their cold timings were not captured. YouTube responses did not expose a cache-hit flag.

| Provider and sample | First observed | Repeat |
|---|---:|---:|
| TikTok video | 150ms, cache hit | 24ms, cache hit |
| TikTok photo post | 27ms, cache hit, 6 results | 30ms, cache hit, 6 results |
| Instagram | 8.9s, `EXTRACTOR_OUTDATED` | 8.0s, `EXTRACTOR_OUTDATED` |
| YouTube normal video | 4.4s, success | 3.6s, success |
| YouTube approximately 3-hour video | 17.6s, success | 11.5s, success |
| Reddit | 13.8s, cache miss | 30ms, cache hit |
| Pinterest | 7.1s, extractor failure | 5.9s, success; later 89ms cache hit |
| Facebook | 6.3s, cache miss | 63ms, cache hit |
| X | 2.1s, cache miss | 28ms, cache hit |

The Instagram extractor error and initial Pinterest failure remain provider-specific production limitations; successful samples met the 20-second target.

## Verification and deployment

- Focused Node SMD proxy suite: 56 passed.
- Backend suite: 40 passed, 15 subtests passed.
- Full Node suite: 127 passed.
- Lint, typecheck, frontend build, nested backend pytest, and `npx vercel build`: passed.
- Vercel output contained 6 functions; SMD, account, and billing catch-all routes remained present.
- Production frontend, SMD proxy, and Render health endpoints returned HTTP 200. Production timing confirmed request ID propagation to the backend.
