export const PAGE_ROUTES: Record<string, string> = {
  Home: '/',
  YouTubeDownloader: '/youtube-downloader',
  Dashboard: '/dashboard',
  RecommendedApps: '/guides',
  HowDownloadDashWorks: '/how-it-works',
  SupportedPlatforms: '/supported-platforms',
  Troubleshooting: '/troubleshooting',
  ResponsibleUse: '/responsible-use',
  Blog: '/blog',
  Disclaimer: '/disclaimer',
  BlogTikTokNoWatermarkGuide: '/blog/how-to-download-tiktok-videos-without-a-watermark',
  BlogSafeYouTubeDownloads: '/blog/how-to-download-youtube-videos-safely',
  BlogInstagramDownloaderGuide: '/blog/instagram-video-downloader-guide',
  BlogBestFreeVideoDownloaderTools: '/blog/best-free-video-downloader-tools',
  BlogIsDownloadingVideosLegal: '/blog/is-downloading-videos-legal',
  BlogSaveVideosOnAndroidIphone: '/blog/save-videos-on-android-and-iphone',
  BlogWhyVideoDownloadsFail: '/blog/why-video-downloads-fail',
  BlogWebAppVsApkGuide: '/blog/web-app-vs-apk-guide',
  BlogPublicLinksAndCreatorRights: '/blog/public-links-and-creator-rights',
  BlogTroubleshootingDownloadDash: '/blog/downloaddash-troubleshooting-checklist',
  PrivacyPolicy: '/privacy-policy',
  TermsOfService: '/terms-of-service',
  Contact: '/contact',
};

const LEGACY_PAGE_ROUTES: Record<string, string[]> = {
  Home: ['/Home'],
  YouTubeDownloader: ['/YouTubeDownloader'],
  Dashboard: ['/Dashboard'],
  RecommendedApps: ['/RecommendedApps'],
  HowDownloadDashWorks: ['/HowDownloadDashWorks'],
  SupportedPlatforms: ['/SupportedPlatforms'],
  Troubleshooting: ['/Troubleshooting'],
  ResponsibleUse: ['/ResponsibleUse'],
  Blog: ['/Blog'],
  Disclaimer: ['/Disclaimer'],
  BlogTikTokNoWatermarkGuide: ['/BlogTikTokNoWatermarkGuide'],
  BlogSafeYouTubeDownloads: ['/BlogSafeYouTubeDownloads'],
  BlogInstagramDownloaderGuide: ['/BlogInstagramDownloaderGuide'],
  BlogBestFreeVideoDownloaderTools: ['/BlogBestFreeVideoDownloaderTools'],
  BlogIsDownloadingVideosLegal: ['/BlogIsDownloadingVideosLegal'],
  BlogSaveVideosOnAndroidIphone: ['/BlogSaveVideosOnAndroidIphone'],
  BlogWhyVideoDownloadsFail: ['/BlogWhyVideoDownloadsFail'],
  BlogWebAppVsApkGuide: ['/BlogWebAppVsApkGuide'],
  BlogPublicLinksAndCreatorRights: ['/BlogPublicLinksAndCreatorRights'],
  BlogTroubleshootingDownloadDash: ['/BlogTroubleshootingDownloadDash'],
  PrivacyPolicy: ['/PrivacyPolicy'],
  TermsOfService: ['/TermsOfService'],
  Contact: ['/Contact'],
};

const normalizePath = (path: string) => {
  if (!path) return '/';
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
};

export function createPageUrl(pageName: string) {
  return PAGE_ROUTES[pageName] || `/${pageName.replace(/ /g, '-').toLowerCase()}`;
}

export function getAllRoutesForPage(pageName: string) {
  const primary = createPageUrl(pageName);
  const legacy = LEGACY_PAGE_ROUTES[pageName] || [];
  return Array.from(new Set([primary, ...legacy].map(normalizePath)));
}

export function getPageNameFromPath(path: string) {
  const normalized = normalizePath(path);
  const match = Object.keys(PAGE_ROUTES).find((pageName) =>
    getAllRoutesForPage(pageName).some((route) => route.toLowerCase() === normalized.toLowerCase())
  );
  return match || null;
}

