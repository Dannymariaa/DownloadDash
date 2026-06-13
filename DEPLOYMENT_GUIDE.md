# DownloadDash Deployment Guide

## Recent Changes (Ads & Download Types Fix)

### What Was Fixed

1. **Ad Placement for All Download Types**
   - HD Download: 30s rewarded ad (before "Claim Award")
   - SD Download: 5s quick ad
   - **Audio/MP3: 5s quick ad (FIXED - was 0s)**
   - Photo/Image: 5s quick ad
   - Album/Carousel: 5s quick ad

2. **Audio Download Flow**
   - Removed special handling that opened external ad link
   - Unified with other download types to show ad gate
   - Audio now respects the same 5s timer as other quick downloads

3. **Photo/Album Handling**
   - Better support for carousel/album detection
   - Audio extraction from photo albums
   - Improved multi-photo download support

4. **Ad Zone Configuration**
   - Added support for 6 additional Monetag zones
   - Improved ad coverage and fallback options
   - Environment variable support for all zones

## Files Changed

```
src/components/DownloaderTemplate.jsx
- Updated AD_GATE_SECONDS.audio from 0 to 5
- Removed audio-specific handling in beginDownloadAfterGate()
- Improved photo/album item handling
- Better audio extraction from albums

src/utils/delayed-ads-loader.js
- Added zone1 and zone2 configurations
- Added environment variable support for new zones
- Monetag zone structure now supports all 6 zones

ADS_CONFIG.md
- Updated with new zone information
- Added environment variable documentation
- Updated redeploy checklist
```

## Prerequisites for Deployment

- Node.js 18+ installed locally
- Git configured with your GitHub account
- Access to:
  - GitHub repository (Dannymariaa/DownloadDash)
  - Render account (for API service)
  - Vercel account (for web app)
  - Hostinger or DNS provider account (for domain)

## Step 1: Prepare Local Changes

```bash
# Navigate to project directory
cd /path/to/DownloadDash

# Verify git status
git status

# The following files should show as modified:
# - src/components/DownloaderTemplate.jsx
# - src/utils/delayed-ads-loader.js
# - ADS_CONFIG.md
```

## Step 2: Test Build Locally

```bash
# Install dependencies (if needed)
npm install

# Run linter to catch issues
npm run lint

# (Optional) Fix any linting issues automatically
npm run lint:fix

# Build the project
npm run build

# Verify dist/ folder was created with no errors
# Check for any build warnings or errors
```

## Step 3: Commit and Push to GitHub

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "Fix: Add audio ads and improve download type ad placement

- Change audio/MP3 download from 0s to 5s ad gate
- Unify audio download flow with other types (remove special handling)
- Improve photo album and carousel detection
- Add support for audio extraction from photo albums
- Add 6 new Monetag ad zones for better coverage
- Update ADS_CONFIG.md with new zone information

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Push to GitHub
git push origin main

# Verify push was successful
git log -1 --oneline
```

## Step 4: Deploy to Render (Backend API)

### Via GitHub (Auto-Deploy)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select the DownloadDash API service
3. Go to "Manual Deploy" → "Deploy latest commit"
4. Wait 2-5 minutes for deployment to complete
5. Check Logs: Should see "Your service is live" message

### Via Terminal (if needed)

```bash
# Render will auto-deploy on push to main
# If manual deployment needed:
# 1. Go to Render dashboard
# 2. Click your service
# 3. Click "Manual Deploy"
# 4. Select "Deploy latest commit"
```

### Verify Render Deployment

```bash
# Test API is responding
curl https://api.downloaddash.store/health

# Should return 200 OK status
```

## Step 5: Deploy to Vercel (Frontend Web App)

### Via GitHub (Auto-Deploy)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the DownloadDash project
3. You should see a new deployment in progress
4. Wait 2-3 minutes for the deployment to complete
5. Check the preview URL to verify it's working

### Via CLI (Optional)

```bash
# If you have Vercel CLI installed:
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### Environment Variables Check (Vercel)

Verify these are set in Vercel project settings:

```
VITE_SMD_API_BASE_URL=https://api.downloaddash.store
VITE_SMD_REQUIRE_API_KEY=false
VITE_MONETAG_IN_PAGE_PUSH_ZONE=11129612
VITE_MONETAG_VIGNETTE_ZONE=11129621
VITE_MONETAG_ONCLICK_ZONE=11133067
VITE_MONETAG_ZONE1_ID=246643
VITE_MONETAG_ZONE2_ID=246109
```

## Step 6: Verify Deployment Success

### Check Frontend

1. Open https://downloaddash.store (or your production URL)
2. Try downloading a video in HD format → Should show 30s ad gate
3. Try downloading in SD format → Should show 5s ad gate
4. Try downloading audio/MP3 → Should show 5s ad gate (NEW)
5. Try downloading a photo → Should show 5s ad gate

### Check Backend API

```bash
# Test basic API connectivity
curl https://api.downloaddash.store/health

# Should return status 200 with success message
```

### Monitor for Errors

- Render: Check service logs for any errors
- Vercel: Check deployment logs and browser console for errors
- Monetag: Check your ad dashboard to see impressions appearing

## Step 7: Monetag Setup (One-Time Configuration)

### If This Is Your First Deployment

1. Log in to [Monetag Dashboard](https://dashboard.monetag.com/)
2. Verify all 6 zones are added:
   - 11129612 (In-Page Push)
   - 11129621 (Vignette Banner)
   - 11133067 (OnClick Popunder)
   - 246643 (Zone 1)
   - 246109 (Zone 2)
   - 11099484 (Legacy/Backup)

3. For each zone:
   - Click "Get tag" or edit zone settings
   - Copy the provided script tag
   - (Already embedded in index.html and delayed-ads-loader.js)

4. Approve your domain for each zone:
   - Go to Zone settings
   - Add your domain (downloaddash.store or whatever domain you use)
   - Wait for approval (usually 24 hours or less)

### Enable Ads on New Zones

1. Ensure domains are approved in Monetag dashboard
2. Verify no additional configuration is needed
3. Monitor ad impressions in Monetag Analytics

## Troubleshooting

### Ads Not Showing

**Problem**: Downloaded content but no ad appeared

**Solutions**:
1. Check browser console for errors (F12 → Console)
2. Verify Monetag zones are approved in dashboard
3. Check that ad scripts are loading (Network tab → Filter by "script")
4. Ensure you're not using ad blocker
5. Wait 5 minutes - sometimes ads take time to initialize

### Build Errors

**Problem**: `npm run build` fails

**Solutions**:
1. Run `npm run lint` to check for syntax errors
2. Delete `node_modules` and `package-lock.json`, then `npm install`
3. Check Node version: `node --version` (should be 18+)
4. Clear npm cache: `npm cache clean --force`

### Deployment Stuck

**Problem**: Render or Vercel deployment taking too long

**Solutions**:
1. **Render**: Go to dashboard → Click service → Check logs
2. **Vercel**: Go to dashboard → Click project → Check deployment logs
3. If stuck > 10 minutes, cancel and retry
4. Check GitHub push was successful: `git log origin/main -1`

### Audio Not Downloading

**Problem**: Audio/MP3 download button doesn't work

**Solutions**:
1. Verify the platform supports audio extraction (YouTube, TikTok, etc.)
2. Check that the source content actually has audio
3. Try a different source URL
4. Check browser console for errors

### Photo Album Only Shows First Photo

**Problem**: Carousel with 5 photos but only 1 downloads

**Solutions**:
1. This is likely a backend API issue (not frontend)
2. Check that the source platform returns all items
3. Verify the API response includes `downloads.items` array
4. Contact API support if backend isn't detecting carousel properly

## Rollback Instructions (If Needed)

If something goes wrong and you need to revert:

```bash
# View commit history
git log --oneline -10

# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to previous version
git reset --hard <commit-hash>
git push origin main --force
```

## Post-Deployment Monitoring

### Daily Checks

- Verify ads appear on each download type
- Check error logs in Render and Vercel
- Monitor Monetag dashboard for impressions

### Weekly Checks

- Verify all ad zones are working
- Check for any user reports of issues
- Monitor bandwidth usage
- Review download statistics

## Support and Resources

- **GitHub Issues**: [Dannymariaa/DownloadDash/issues](https://github.com/Dannymariaa/DownloadDash/issues)
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Monetag Support**: https://monetag.com/support
- **YouTube API**: https://developers.google.com/youtube/v3

## Next Steps After Deployment

1. ✅ Verify all ad types show correctly
2. ✅ Test downloads for each platform
3. ✅ Monitor Monetag for impressions
4. ✅ Gather user feedback
5. Plan future improvements based on analytics

## Deployment Checklist

- [ ] Local build successful (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] All changes committed to GitHub
- [ ] Push to GitHub complete
- [ ] Render deployment complete
- [ ] Vercel deployment complete
- [ ] Frontend loads without errors
- [ ] HD download shows 30s ad
- [ ] SD download shows 5s ad
- [ ] Audio download shows 5s ad (NEW)
- [ ] Photo download shows 5s ad
- [ ] Album download shows 5s ad
- [ ] No errors in browser console
- [ ] No errors in Render logs
- [ ] Monetag dashboard shows impressions

