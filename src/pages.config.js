/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import Home from './pages/Home';
import __Layout from './Layout.jsx';

const YouTubeDownloader = lazy(() => import('./pages/YouTubeDownloader'));
const InstagramDownloader = lazy(() => import('./pages/InstagramDownloader'));
const TikTokDownloader = lazy(() => import('./pages/TikTokDownloader'));
const RedditDownloader = lazy(() => import('./pages/RedditDownloader'));
const PinterestDownloader = lazy(() => import('./pages/PinterestDownloader'));
const FacebookDownloader = lazy(() => import('./pages/FacebookDownloader'));
const TwitterDownloader = lazy(() => import('./pages/TwitterDownloader'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Account = lazy(() => import('./pages/Account'));
const RecommendedApps = lazy(() => import('./pages/RecommendedApps'));
const HowDownloadDashWorks = lazy(() => import('./pages/HowDownloadDashWorks'));
const SupportedPlatforms = lazy(() => import('./pages/SupportedPlatforms'));
const Troubleshooting = lazy(() => import('./pages/Troubleshooting'));
const ResponsibleUse = lazy(() => import('./pages/ResponsibleUse'));
const Blog = lazy(() => import('./pages/Blog'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const BlogTikTokNoWatermarkGuide = lazy(() => import('./pages/BlogTikTokNoWatermarkGuide'));
const BlogSafeYouTubeDownloads = lazy(() => import('./pages/BlogSafeYouTubeDownloads'));
const BlogInstagramDownloaderGuide = lazy(() => import('./pages/BlogInstagramDownloaderGuide'));
const BlogBestFreeVideoDownloaderTools = lazy(() => import('./pages/BlogBestFreeVideoDownloaderTools'));
const BlogIsDownloadingVideosLegal = lazy(() => import('./pages/BlogIsDownloadingVideosLegal'));
const BlogSaveVideosOnAndroidIphone = lazy(() => import('./pages/BlogSaveVideosOnAndroidIphone'));
const BlogWhyVideoDownloadsFail = lazy(() => import('./pages/BlogWhyVideoDownloadsFail'));
const BlogWebAppVsApkGuide = lazy(() => import('./pages/BlogWebAppVsApkGuide'));
const BlogPublicLinksAndCreatorRights = lazy(() => import('./pages/BlogPublicLinksAndCreatorRights'));
const BlogTroubleshootingDownloadDash = lazy(() => import('./pages/BlogTroubleshootingDownloadDash'));
const BlogTikTokNoWatermark2026 = lazy(() => import('./pages/BlogTikTokNoWatermark2026'));
const BlogYouTubeDownloadGuide2026 = lazy(() => import('./pages/BlogYouTubeDownloadGuide2026'));
const BlogInstagramReelsDownloadTutorial = lazy(() => import('./pages/BlogInstagramReelsDownloadTutorial'));
const BlogWhyVideoDownloadersFeelUnsafe = lazy(() => import('./pages/BlogWhyVideoDownloadersFeelUnsafe'));
const BlogMobileFirstModernWebApps = lazy(() => import('./pages/BlogMobileFirstModernWebApps'));
const BlogImportanceOfTrustPages = lazy(() => import('./pages/BlogImportanceOfTrustPages'));
const BlogFastWebsitesRankBetter = lazy(() => import('./pages/BlogFastWebsitesRankBetter'));
const BlogGoogleSearchIndexingWorks = lazy(() => import('./pages/BlogGoogleSearchIndexingWorks'));
const BlogInstagramContentLibrary2026 = lazy(() => import('./pages/BlogInstagramContentLibrary2026'));
const BlogTikTokCreatorArchiveWorkflow = lazy(() => import('./pages/BlogTikTokCreatorArchiveWorkflow'));
const BlogFacebookPublicMediaGuide = lazy(() => import('./pages/BlogFacebookPublicMediaGuide'));
const BlogPinterestVisualResearchLibrary = lazy(() => import('./pages/BlogPinterestVisualResearchLibrary'));
const BlogRedditMediaResearchGuide = lazy(() => import('./pages/BlogRedditMediaResearchGuide'));
const BlogXRealTimeMediaArchive = lazy(() => import('./pages/BlogXRealTimeMediaArchive'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Contact = lazy(() => import('./pages/Contact'));
const TrustCenter = lazy(() => import('./pages/TrustCenter'));
const About = lazy(() => import('./pages/About'));
const SafetyCenter = lazy(() => import('./pages/SafetyCenter'));
const TransparencyStatement = lazy(() => import('./pages/TransparencyStatement'));
const DMCA = lazy(() => import('./pages/DMCA'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement'));
const FAQ = lazy(() => import('./pages/FAQ'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const SystemStatus = lazy(() => import('./pages/SystemStatus'));
const Updates = lazy(() => import('./pages/Updates'));
const PlatformGuides = lazy(() => import('./pages/PlatformGuides'));
const AppDownload = lazy(() => import('./pages/AppDownload'));


export const PAGES = {
    "Home": Home,
    "YouTubeDownloader": YouTubeDownloader,
    "InstagramDownloader": InstagramDownloader,
    "TikTokDownloader": TikTokDownloader,
    "RedditDownloader": RedditDownloader,
    "PinterestDownloader": PinterestDownloader,
    "FacebookDownloader": FacebookDownloader,
    "TwitterDownloader": TwitterDownloader,
    "Dashboard": Dashboard,
    "Account": Account,
    "RecommendedApps": RecommendedApps,
    "HowDownloadDashWorks": HowDownloadDashWorks,
    "SupportedPlatforms": SupportedPlatforms,
    "Troubleshooting": Troubleshooting,
    "ResponsibleUse": ResponsibleUse,
    "Blog": Blog,
    "Disclaimer": Disclaimer,
    "BlogTikTokNoWatermarkGuide": BlogTikTokNoWatermarkGuide,
    "BlogSafeYouTubeDownloads": BlogSafeYouTubeDownloads,
    "BlogInstagramDownloaderGuide": BlogInstagramDownloaderGuide,
    "BlogBestFreeVideoDownloaderTools": BlogBestFreeVideoDownloaderTools,
    "BlogIsDownloadingVideosLegal": BlogIsDownloadingVideosLegal,
    "BlogSaveVideosOnAndroidIphone": BlogSaveVideosOnAndroidIphone,
    "BlogWhyVideoDownloadsFail": BlogWhyVideoDownloadsFail,
    "BlogWebAppVsApkGuide": BlogWebAppVsApkGuide,
    "BlogPublicLinksAndCreatorRights": BlogPublicLinksAndCreatorRights,
    "BlogTroubleshootingDownloadDash": BlogTroubleshootingDownloadDash,
    "BlogTikTokNoWatermark2026": BlogTikTokNoWatermark2026,
    "BlogYouTubeDownloadGuide2026": BlogYouTubeDownloadGuide2026,
    "BlogInstagramReelsDownloadTutorial": BlogInstagramReelsDownloadTutorial,
    "BlogWhyVideoDownloadersFeelUnsafe": BlogWhyVideoDownloadersFeelUnsafe,
    "BlogMobileFirstModernWebApps": BlogMobileFirstModernWebApps,
    "BlogImportanceOfTrustPages": BlogImportanceOfTrustPages,
    "BlogFastWebsitesRankBetter": BlogFastWebsitesRankBetter,
    "BlogGoogleSearchIndexingWorks": BlogGoogleSearchIndexingWorks,
    "BlogInstagramContentLibrary2026": BlogInstagramContentLibrary2026,
    "BlogTikTokCreatorArchiveWorkflow": BlogTikTokCreatorArchiveWorkflow,
    "BlogFacebookPublicMediaGuide": BlogFacebookPublicMediaGuide,
    "BlogPinterestVisualResearchLibrary": BlogPinterestVisualResearchLibrary,
    "BlogRedditMediaResearchGuide": BlogRedditMediaResearchGuide,
    "BlogXRealTimeMediaArchive": BlogXRealTimeMediaArchive,
    "PrivacyPolicy": PrivacyPolicy,
    "TermsOfService": TermsOfService,
    "Contact": Contact,
    "TrustCenter": TrustCenter,
    "About": About,
    "SafetyCenter": SafetyCenter,
    "TransparencyStatement": TransparencyStatement,
    "DMCA": DMCA,
    "CookiePolicy": CookiePolicy,
    "AccessibilityStatement": AccessibilityStatement,
    "FAQ": FAQ,
    "HelpCenter": HelpCenter,
    "SystemStatus": SystemStatus,
    "Updates": Updates,
    "PlatformGuides": PlatformGuides,
    "AppDownload": AppDownload,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
