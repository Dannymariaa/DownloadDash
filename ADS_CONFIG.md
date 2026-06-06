# Ads Configuration

DownloadDash uses the Monetag Multitag provider for the website, PWA, and mobile web app:

```html
<script src="https://3nbf4.com/88/tag.min.js" data-zone="11099484" async data-cfasync="false"></script>
```

## Runtime Files

- [src/utils/delayed-ads-loader.js](src/utils/delayed-ads-loader.js) creates the provider script tag after a short delay or first user interaction.
- [src/config/adConfig.js](src/config/adConfig.js) stores the provider, script URL, and zone ID.
- [src/components/AdBanner.jsx](src/components/AdBanner.jsx) reserves stable advertisement space in the web UI.
- [mobile/app.json](mobile/app.json) stores the same provider metadata for the Expo app.
- [mobile/utils/adsManager.js](mobile/utils/adsManager.js) exposes the mobile ad helpers without any Google ad SDK dependency.

## Current Values

- Provider: `monetag`
- Format: `multitag`
- Script: `https://3nbf4.com/88/tag.min.js`
- Primary Zone ID: `11099484`
- Push Notifications: `11099484`
- Vignette Banner: `11099483`
- In-Page Push: `11099482`
- OnClick Popunder: `11099481`
- `data-cfasync`: `false`

## Notes

- The app no longer uses Google mobile ads or Google display ad tags.
- The web loader prevents duplicate script insertion with `data-ad-provider-loaded="true"`.
- Download functionality works independently of ad loading.

## Redeploy Checklist

1. Commit and push these files to GitHub.
2. Redeploy the Render API service from the latest GitHub commit.
3. In Render, make sure `SMD_REQUIRE_API_KEY` is either missing or set to `false`.
4. Redeploy the Vercel web app from the latest GitHub commit.
5. In Vercel, set `VITE_SMD_API_BASE_URL=https://api.downloaddash.store`.
6. In Vercel, set `VITE_SMD_REQUIRE_API_KEY=false` or leave it unset.
7. In Vercel, remove `VITE_SMD_API_KEY` unless you intentionally re-enable API key enforcement.
8. If you intentionally re-enable API key enforcement later, set both `SMD_REQUIRE_API_KEY=true` and `SMD_API_KEY=...` on Render, then set both `VITE_SMD_REQUIRE_API_KEY=true` and the matching `VITE_SMD_API_KEY=...` on Vercel.
9. Keep the Monetag tag active:

```html
<script src="https://3nbf4.com/88/tag.min.js" data-zone="11099484" async data-cfasync="false"></script>
```

The Monetag tag is already present in [index.html](index.html) and the shared loader in [src/utils/delayed-ads-loader.js](src/utils/delayed-ads-loader.js), so ads can start after Vercel serves the updated build and Monetag has approved the domain/zone.
