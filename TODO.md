- [ ] Review vercel.json for routing directives that could block /api/smd/* filesystem routing.
- [ ] Review api/smd/[...path].js exports/runtime assumptions.
- [ ] Determine if vercel.json rewrites/directives route /api/* to index.html, causing NOT_FOUND.
- [ ] If found, minimally repair vercel.json only (no backend changes).
- [ ] Produce git diff + git commands only.

