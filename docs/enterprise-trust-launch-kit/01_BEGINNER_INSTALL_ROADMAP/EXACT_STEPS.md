# Exact Beginner Steps for DownloadDash

## Step 1: Open Your Project

Open VS Code.

Open the folder for your DownloadDash project.

You should see:

- package.json
- src
- public
- index.html

## Step 2: Add Vercel Security Config

Copy:

`02_SECURITY_AND_VERCEL/vercel.json`

Paste it into the main project folder, the same place as `package.json`.

## Step 3: Add SEO Public Files

Copy all files from:

`03_PUBLIC_SEO_FILES`

Paste them into your project `public` folder.

Important:
- `robots.txt` must be at `/public/robots.txt`
- `sitemap.xml` must be at `/public/sitemap.xml`
- `site.webmanifest` must be at `/public/site.webmanifest`

## Step 4: Add React Components

Copy files from:

`05_REACT_READY_COMPONENTS`

Paste them into:

`src/components`

or create that folder if it does not exist.

## Step 5: Add Routes

Use:

`06_REACT_ROUTING_EXAMPLES/AppRoutesExample.jsx`

as a guide.

You need these pages:

- /
- /about
- /privacy
- /terms
- /responsible-use
- /dmca
- /contact
- /faq
- /guides
- /safety
- /transparency
- /cookies
- /accessibility

## Step 6: Add Footer Everywhere

Add the Footer component so every page links to:

- About
- Privacy
- Terms
- Contact
- DMCA
- Responsible Use
- FAQ
- Safety
- Transparency

This helps users, Google, and reviewers find your trust pages.

## Step 7: Add Homepage Trust Content

Place `HomepageTrustUpgrade.jsx` under your main download box.

This gives your homepage real written content and reduces the “thin utility page” problem.

## Step 8: Add Guide Articles

Use the files in:

`08_GUIDE_ARTICLES_FOR_SEO`

Create at least 5 guide pages or blog posts.

## Step 9: Commit and Push

In VS Code terminal:

git add .
git commit -m "Enterprise trust SEO security and AdSense upgrade"
git push

## Step 10: Redeploy on Vercel

Vercel should redeploy automatically after you push to GitHub.

## Step 11: Test Live Site

Use:

`11_TESTING_AND_REVIEW_CHECKLISTS/LIVE_SITE_TEST_CHECKLIST.md`

## Step 12: Google Search Console

Submit:

https://www.downloaddash.store/sitemap.xml

## Step 13: AdSense

After everything is live and tested, request AdSense review again.
