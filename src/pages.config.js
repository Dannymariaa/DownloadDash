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
import Home from './pages/Home';
import YouTubeDownloader from './pages/YouTubeDownloader';
import Dashboard from './pages/Dashboard';
import RecommendedApps from './pages/RecommendedApps';
import HowDownloadDashWorks from './pages/HowDownloadDashWorks';
import SupportedPlatforms from './pages/SupportedPlatforms';
import Troubleshooting from './pages/Troubleshooting';
import ResponsibleUse from './pages/ResponsibleUse';
import Blog from './pages/Blog';
import Disclaimer from './pages/Disclaimer';
import BlogTikTokNoWatermarkGuide from './pages/BlogTikTokNoWatermarkGuide';
import BlogSafeYouTubeDownloads from './pages/BlogSafeYouTubeDownloads';
import BlogInstagramDownloaderGuide from './pages/BlogInstagramDownloaderGuide';
import BlogBestFreeVideoDownloaderTools from './pages/BlogBestFreeVideoDownloaderTools';
import BlogIsDownloadingVideosLegal from './pages/BlogIsDownloadingVideosLegal';
import BlogSaveVideosOnAndroidIphone from './pages/BlogSaveVideosOnAndroidIphone';
import BlogWhyVideoDownloadsFail from './pages/BlogWhyVideoDownloadsFail';
import BlogWebAppVsApkGuide from './pages/BlogWebAppVsApkGuide';
import BlogPublicLinksAndCreatorRights from './pages/BlogPublicLinksAndCreatorRights';
import BlogTroubleshootingDownloadDash from './pages/BlogTroubleshootingDownloadDash';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import TrustCenter from './pages/TrustCenter';
import About from './pages/About';
import SafetyCenter from './pages/SafetyCenter';
import TransparencyStatement from './pages/TransparencyStatement';
import DMCA from './pages/DMCA';
import CookiePolicy from './pages/CookiePolicy';
import AccessibilityStatement from './pages/AccessibilityStatement';
import FAQ from './pages/FAQ';
import HelpCenter from './pages/HelpCenter';
import SystemStatus from './pages/SystemStatus';
import Updates from './pages/Updates';
import PlatformGuides from './pages/PlatformGuides';
import AppDownload from './pages/AppDownload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "YouTubeDownloader": YouTubeDownloader,
    "Dashboard": Dashboard,
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
