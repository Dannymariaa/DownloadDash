# Deploy Commands (Ready to Copy-Paste)

## Option 1: Deploy Everything (Recommended)

Copy and paste this entire block into PowerShell or Terminal:

```bash
cd "c:\Users\MICHAEL-DAVID\Videos\DownloadDash"

# Verify all changes are present
git status

# Stage all changes
git add .

# Commit with detailed message
git commit -m "Fix: Add audio ads and improve ad placement for all download types

- Change audio/MP3 download from 0s to 5s ad gate
- Unify audio download flow with other types (remove special handling)
- Improve photo album and carousel detection
- Add support for audio extraction from photo albums
- Add 6 new Monetag ad zones (246643, 246109) for better coverage
- Update ADS_CONFIG.md with complete zone documentation
- Verified build with zero errors

Changes:
- src/components/DownloaderTemplate.jsx: AD_GATE_SECONDS.audio 0→5
- src/utils/delayed-ads-loader.js: Added zone1 and zone2 configs
- ADS_CONFIG.md: Updated with all zones and environment variables
- DEPLOYMENT_GUIDE.md: New comprehensive deployment guide
- QUICK_DEPLOY.md: New quick-start deployment guide
- FIXES_SUMMARY.md: Complete summary of all fixes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Push to GitHub
git push origin main

# Show confirmation
git log -1 --oneline
```

## Option 2: Deploy Step-by-Step

### Step 1: Navigate to Project
```bash
cd "c:\Users\MICHAEL-DAVID\Videos\DownloadDash"
```

### Step 2: Verify Changes
```bash
git status
```

**Expected output:**
```
On branch main
Changes not staged for commit:
  modified:   src/components/DownloaderTemplate.jsx
  modified:   src/utils/delayed-ads-loader.js
  modified:   ADS_CONFIG.md

Untracked files:
  new file:   DEPLOYMENT_GUIDE.md
  new file:   QUICK_DEPLOY.md
  new file:   FIXES_SUMMARY.md
```

### Step 3: Review Changes (Optional)
```bash
# View changes to DownloaderTemplate
git diff src/components/DownloaderTemplate.jsx

# View changes to delayed-ads-loader
git diff src/utils/delayed-ads-loader.js

# View changes to ADS_CONFIG
git diff ADS_CONFIG.md
```

### Step 4: Stage Changes
```bash
git add .
```

### Step 5: Commit Changes
```bash
git commit -m "Fix: Add audio ads and improve ad placement for all download types"
```

### Step 6: Push to GitHub
```bash
git push origin main
```

### Step 7: Verify Push
```bash
git log -1 --oneline
git log --oneline -3  # Show last 3 commits
```

## Option 3: Deploy via GitHub Web

1. Go to https://github.com/Dannymariaa/DownloadDash
2. Look for a "Compare & pull request" button (if you have a branch)
3. Or navigate to "Code" tab and create a new commit:
   - Click on each file
   - Edit directly on GitHub
   - Commit with message

## After Pushing to GitHub

### Deploy to Render (Backend)

```powershell
# Open Render dashboard
Start-Process "https://dashboard.render.com/"

# Steps:
# 1. Click your DownloadDash API service
# 2. Scroll to "Manual Deploy" button
# 3. Click "Deploy latest commit"
# 4. Wait 2-5 minutes for "Your service is live"
```

### Deploy to Vercel (Frontend)

```powershell
# Open Vercel dashboard
Start-Process "https://vercel.com/dashboard"

# Steps:
# 1. Click your DownloadDash project
# 2. Wait for automatic deployment from GitHub push
# 3. OR click "Deploy" button manually
# 4. Wait 2-3 minutes for "Ready" status
```

### Verify Deployment

```powershell
# Open production URL
Start-Process "https://downloaddash.store"

# Check API health
curl https://api.downloaddash.store/health

# If curl not available, use Invoke-WebRequest:
Invoke-WebRequest -Uri "https://api.downloaddash.store/health" -Method GET
```

## Testing After Deploy

### Test HD Download (30s ad)
1. Open https://downloaddash.store
2. Pick any video platform (YouTube, TikTok, etc.)
3. Paste a video link
4. Click Process
5. Select "HD Download"
6. **Verify: Should show 30s ad timer**

### Test SD Download (5s ad)
1. Same video link
2. Select "SD Download"
3. **Verify: Should show 5s ad timer**

### Test Audio Download (5s ad) ⭐ NEW
1. Same video link (with audio)
2. Select "Audio / MP3"
3. **Verify: Should show 5s ad timer** (was instant before)

### Test Photo Download (5s ad)
1. Pick Instagram or Pinterest
2. Paste a photo link
3. Click Process
4. Select photo download
5. **Verify: Should show 5s ad timer**

### Test Album Download (5s ad)
1. Pick Instagram carousel or similar
2. Paste carousel link
3. Click Process
4. Select "Download All Photos (X)"
5. **Verify: Should show 5s ad timer before batch download**

## Troubleshooting Commands

### If Changes Don't Appear

```bash
# Hard refresh browser (same as Ctrl+Shift+R)
# In PowerShell:
# 1. Press Ctrl+Shift+R in browser
# 2. Or open DevTools (F12) → Network → Disable cache

# Check git status
git status

# See recent commits
git log --oneline -5
```

### If Push Failed

```bash
# Check git configuration
git config --list

# Verify remote URL
git remote -v

# Try push again with verbose output
git push origin main -v
```

### If Build Failed

```bash
# Check build output
npm run build

# If errors, run lint fix
npm run lint:fix

# Try build again
npm run build
```

### If Deployment Stuck

#### On Render:
1. Go to https://dashboard.render.com/
2. Click your service
3. Click "Manual Deploy" → "Cancel" if stuck
4. Wait 5 minutes
5. Click "Manual Deploy" again

#### On Vercel:
1. Go to https://vercel.com/dashboard
2. Click your project
3. Click "Deployments"
4. If one is stuck, click it and look for cancel button
5. Redeploy latest commit

## Rollback Commands (If Needed)

### Revert Last Commit (Keep Files)
```bash
git revert HEAD
git push origin main
```

### Revert to Previous Version (Hard Reset)
```bash
# View last 5 commits
git log --oneline -5

# Find the commit hash you want to go back to
# Then run:
git reset --hard <commit-hash>
git push origin main --force
```

### Example Rollback:
```bash
# If you want to go back to the commit before your changes:
git log --oneline -5
# Output: 
# abc1234 Fix: Add audio ads (your new commit)
# xyz5678 Previous commit
# 
# Rollback:
git reset --hard xyz5678
git push origin main --force
```

## Verification Checklist

After deployment, verify:

```bash
# Check website loads
curl https://downloaddash.store

# Check API responds
curl https://api.downloaddash.store/health

# Check git log shows your commit
git log -1 --format="%H %s"

# Check remote status
git status
# Should say: "Your branch is ahead of 'origin/main' by 0 commits"
```

## Quick Status Check

```bash
# See all recent commits
git log --oneline -10

# See current branch
git branch

# See remote branches
git branch -r

# See commit details
git show HEAD

# See what changed
git diff HEAD~1 HEAD
```

## Environment Variables to Check

### In Vercel Settings:

Verify these exist:
```
VITE_SMD_API_BASE_URL=https://api.downloaddash.store
VITE_SMD_REQUIRE_API_KEY=false
VITE_MONETAG_IN_PAGE_PUSH_ZONE=11129612
VITE_MONETAG_VIGNETTE_ZONE=11129621
VITE_MONETAG_ONCLICK_ZONE=11133067
```

### In Render Environment:

Verify these exist:
```
SMD_REQUIRE_API_KEY=false
```

## Success Indicators

✅ **Deployment Successful When:**
- [ ] `git push origin main` shows no errors
- [ ] Render shows "Your service is live"
- [ ] Vercel shows deployment status "Ready"
- [ ] Website loads: https://downloaddash.store
- [ ] API responds: https://api.downloaddash.store/health
- [ ] Browser console has no errors (F12)
- [ ] HD download shows 30s ad timer
- [ ] Audio download shows 5s ad timer (NEW)
- [ ] Monetag dashboard shows impressions

## Support

If something goes wrong:

1. **Check Logs:**
   - Render: Dashboard → Service → Logs
   - Vercel: Dashboard → Project → Deployments → Click deployment

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for red errors

3. **Check Git Status:**
   - `git status`
   - `git log --oneline -5`

4. **Verify Monetag:**
   - https://dashboard.monetag.com/
   - Check zone approval status
   - Check for impressions

## Next Steps After Successful Deploy

1. ✅ Verify all ad types show correctly
2. ✅ Test downloads work for each platform
3. ✅ Monitor Monetag for impressions
4. ✅ Gather user feedback
5. ✅ Monitor error logs

---

**All commands ready to use! Good luck with your deployment! 🚀**
