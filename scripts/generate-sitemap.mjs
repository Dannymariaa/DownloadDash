import { writeFile } from 'node:fs/promises';

const baseUrl = 'https://www.downloaddash.store';
const lastmod = new Date().toISOString().slice(0, 10);

const routes = [
  ['/', 'weekly', '1.0'],
  ['/tiktok-downloader', 'weekly', '0.95'],
  ['/instagram-downloader', 'weekly', '0.95'],
  ['/facebook-downloader', 'weekly', '0.95'],
  ['/youtube-downloader', 'weekly', '0.95'],
  ['/x-downloader', 'weekly', '0.95'],
  ['/reddit-downloader', 'weekly', '0.95'],
  ['/pinterest-downloader', 'weekly', '0.95'],
  ['/blog', 'weekly', '0.8'],
  ['/guides', 'weekly', '0.8'],
  ['/how-it-works', 'monthly', '0.75'],
  ['/supported-platforms', 'weekly', '0.8'],
  ['/troubleshooting', 'monthly', '0.75'],
  ['/responsible-use', 'monthly', '0.7'],
  ['/faq', 'monthly', '0.8'],
  ['/about', 'monthly', '0.7'],
  ['/help-center', 'monthly', '0.7'],
  ['/contact', 'monthly', '0.6'],
  ['/privacy-policy', 'monthly', '0.6'],
  ['/terms-of-service', 'monthly', '0.6'],
  ['/dmca', 'monthly', '0.5'],
  ['/trust-center', 'monthly', '0.6'],
  ['/safety-center', 'monthly', '0.6'],
  ['/transparency', 'monthly', '0.6'],
  ['/cookie-policy', 'monthly', '0.5'],
  ['/accessibility', 'monthly', '0.5'],
  ['/status', 'weekly', '0.6'],
  ['/updates', 'monthly', '0.6'],
  ['/platform-guides', 'monthly', '0.7'],
  ['/android-app', 'monthly', '0.7'],
  ['/blog/how-to-download-tiktok-videos-without-a-watermark', 'monthly', '0.7'],
  ['/blog/how-to-download-youtube-videos-safely', 'monthly', '0.7'],
  ['/blog/instagram-video-downloader-guide', 'monthly', '0.7'],
  ['/blog/best-free-video-downloader-tools', 'monthly', '0.7'],
  ['/blog/is-downloading-videos-legal', 'monthly', '0.7'],
  ['/blog/save-videos-on-android-and-iphone', 'monthly', '0.7'],
  ['/blog/why-video-downloads-fail', 'monthly', '0.7'],
  ['/blog/web-app-vs-apk-guide', 'monthly', '0.7'],
  ['/blog/public-links-and-creator-rights', 'monthly', '0.7'],
  ['/blog/downloaddash-troubleshooting-checklist', 'monthly', '0.7'],
  ['/blog/tiktok-no-watermark-2026', 'monthly', '0.75'],
  ['/blog/youtube-download-guide-2026', 'monthly', '0.75'],
  ['/blog/instagram-reels-download-tutorial', 'monthly', '0.75'],
  ['/blog/why-video-downloaders-feel-unsafe', 'monthly', '0.7'],
  ['/blog/mobile-first-modern-web-apps', 'monthly', '0.7'],
  ['/blog/importance-of-trust-pages', 'monthly', '0.7'],
  ['/blog/fast-websites-rank-better', 'monthly', '0.7'],
  ['/blog/google-search-indexing-works', 'monthly', '0.7'],
  ['/blog/instagram-content-library-2026', 'monthly', '0.75'],
  ['/blog/tiktok-creator-archive-workflow', 'monthly', '0.75'],
  ['/blog/facebook-public-media-saving-guide', 'monthly', '0.75'],
  ['/blog/pinterest-visual-research-library', 'monthly', '0.75'],
  ['/blog/reddit-media-research-guide', 'monthly', '0.75'],
  ['/blog/x-real-time-media-archive', 'monthly', '0.75'],
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ([path, changefreq, priority]) => `  <url>
    <loc>${baseUrl}${path === '/' ? '/' : path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
