import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Home, Download, User, LogIn, Bookmark, History, FileText, LifeBuoy, ShieldCheck, ChevronDown, Settings2, Bell } from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  RedditIcon,
  TikTokIcon,
  TwitterXIcon,
  YouTubeIcon,
} from '@/components/PlatformIcons';
import { Button } from '@/components/ui/button';
import downloadDash from '@/api/downloadDashClient';
import LanguageSelector from '@/components/LanguageSelector';
import { useI18n } from '@/lib/i18n';

const AutoAdManager = lazy(() => import('@/components/Ads/AutoAdManager.jsx'));

const platformNavItems = [
  { page: 'YouTubeDownloader', label: 'YouTube', Icon: YouTubeIcon, hover: 'hover:text-red-400', mobileHover: 'hover:bg-red-500/20' },
  { page: 'InstagramDownloader', label: 'Instagram', Icon: InstagramIcon, hover: 'hover:text-pink-300', mobileHover: 'hover:bg-pink-500/20' },
  { page: 'TikTokDownloader', label: 'TikTok', Icon: TikTokIcon, hover: 'hover:text-cyan-300', mobileHover: 'hover:bg-cyan-500/20' },
  { page: 'FacebookDownloader', label: 'Facebook', Icon: FacebookIcon, hover: 'hover:text-blue-300', mobileHover: 'hover:bg-blue-500/20' },
  { page: 'PinterestDownloader', label: 'Pinterest', Icon: PinterestIcon, hover: 'hover:text-red-300', mobileHover: 'hover:bg-red-500/20' },
  { page: 'RedditDownloader', label: 'Reddit', Icon: RedditIcon, hover: 'hover:text-orange-300', mobileHover: 'hover:bg-orange-500/20' },
  { page: 'TwitterDownloader', label: 'X', Icon: TwitterXIcon, hover: 'hover:text-white', mobileHover: 'hover:bg-gray-800' },
];

const getPageTheme = (pageName) => {
  if (pageName?.startsWith('Blog')) {
    return {
      border: 'border-sky-400/20',
      accentText: 'text-sky-300',
      brand: 'from-sky-400 to-fuchsia-400',
      badgeBg: 'bg-sky-400/10',
      badgeBorder: 'border-sky-400/25',
      ribbonTitle: 'Editorial Reading Mode',
      ribbonBody: 'You are in a dedicated article or blog view, separate from the homepage and downloader screens.',
    };
  }

  const themes = {
    Home: {
      border: 'border-purple-500/20',
      accentText: 'text-purple-300',
      brand: 'from-purple-400 to-pink-400',
    },
    RecommendedApps: {
      border: 'border-cyan-400/20',
      accentText: 'text-cyan-300',
      brand: 'from-cyan-300 to-fuchsia-400',
      badgeBg: 'bg-cyan-400/10',
      badgeBorder: 'border-cyan-400/25',
      ribbonTitle: 'Guides Hub',
      ribbonBody: 'This page is a content directory designed to send users to the right guide, support page, or legal page.',
    },
    HowDownloadDashWorks: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Workflow Explainer',
      ribbonBody: 'This page explains how the product works instead of acting like a landing page or a downloader screen.',
    },
    SupportedPlatforms: {
      border: 'border-orange-400/20',
      accentText: 'text-orange-300',
      brand: 'from-orange-300 to-rose-300',
      badgeBg: 'bg-orange-400/10',
      badgeBorder: 'border-orange-400/25',
      ribbonTitle: 'Coverage Page',
      ribbonBody: 'This page is focused on supported platforms, device expectations, and format variability.',
    },
    Troubleshooting: {
      border: 'border-rose-400/20',
      accentText: 'text-rose-300',
      brand: 'from-rose-300 to-amber-300',
      badgeBg: 'bg-rose-400/10',
      badgeBorder: 'border-rose-400/25',
      ribbonTitle: 'Support Diagnostics',
      ribbonBody: 'This page is a troubleshooting surface for failures, warnings, and install problems.',
    },
    ResponsibleUse: {
      border: 'border-lime-400/20',
      accentText: 'text-lime-300',
      brand: 'from-lime-300 to-emerald-300',
      badgeBg: 'bg-lime-400/10',
      badgeBorder: 'border-lime-400/25',
      ribbonTitle: 'Rights And Standards',
      ribbonBody: 'This page exists to clarify lawful use, creator rights, and DownloadDash usage boundaries.',
    },
    Blog: {
      border: 'border-sky-400/20',
      accentText: 'text-sky-300',
      brand: 'from-sky-300 to-fuchsia-300',
      badgeBg: 'bg-sky-400/10',
      badgeBorder: 'border-sky-400/25',
      ribbonTitle: 'Editorial Reading Mode',
      ribbonBody: 'This page is intentionally styled as a blog destination rather than a homepage section.',
    },
    PrivacyPolicy: {
      border: 'border-sky-400/20',
      accentText: 'text-sky-300',
      brand: 'from-sky-400 to-blue-400',
      badgeBg: 'bg-sky-400/10',
      badgeBorder: 'border-sky-400/25',
      ribbonTitle: 'Legal Document',
      ribbonBody: 'This page is a standalone legal reference page with a document-style layout.',
    },
    TermsOfService: {
      border: 'border-amber-400/20',
      accentText: 'text-amber-300',
      brand: 'from-amber-300 to-orange-300',
      badgeBg: 'bg-amber-400/10',
      badgeBorder: 'border-amber-400/25',
      ribbonTitle: 'Legal Document',
      ribbonBody: 'This page is a standalone terms and rules reference, not a homepage-style marketing block.',
    },
    Disclaimer: {
      border: 'border-rose-400/20',
      accentText: 'text-rose-300',
      brand: 'from-rose-300 to-pink-300',
      badgeBg: 'bg-rose-400/10',
      badgeBorder: 'border-rose-400/25',
      ribbonTitle: 'Legal Document',
      ribbonBody: 'This page provides service limitations and responsibility boundaries in a separate legal-doc style.',
    },
    Contact: {
      border: 'border-blue-400/20',
      accentText: 'text-blue-300',
      brand: 'from-blue-300 to-cyan-300',
      badgeBg: 'bg-blue-400/10',
      badgeBorder: 'border-blue-400/25',
      ribbonTitle: 'Support Desk',
      ribbonBody: 'This page is a dedicated support and contact destination, separate from homepage messaging.',
    },
    TrustCenter: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This section exposes the Enterprise Trust Launch Kit pages inside the live app.',
    },
    About: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    SafetyCenter: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    TransparencyStatement: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    DMCA: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    CookiePolicy: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    AccessibilityStatement: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    FAQ: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Trust Center',
      ribbonBody: 'This page is part of the Enterprise Trust Launch Kit.',
    },
    HelpCenter: {
      border: 'border-cyan-400/20',
      accentText: 'text-cyan-300',
      brand: 'from-cyan-300 to-emerald-300',
      badgeBg: 'bg-cyan-400/10',
      badgeBorder: 'border-cyan-400/25',
      ribbonTitle: 'Help Center',
      ribbonBody: 'This page turns the Enterprise Trust Content System into practical support guidance.',
    },
    SystemStatus: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-cyan-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'System Status',
      ribbonBody: 'This page explains current service status and source-platform variability.',
    },
    Updates: {
      border: 'border-violet-400/20',
      accentText: 'text-violet-300',
      brand: 'from-violet-300 to-cyan-300',
      badgeBg: 'bg-violet-400/10',
      badgeBorder: 'border-violet-400/25',
      ribbonTitle: 'Product Updates',
      ribbonBody: 'This page gives users and reviewers a maintained changelog signal.',
    },
    PlatformGuides: {
      border: 'border-amber-400/20',
      accentText: 'text-amber-300',
      brand: 'from-amber-300 to-orange-300',
      badgeBg: 'bg-amber-400/10',
      badgeBorder: 'border-amber-400/25',
      ribbonTitle: 'Platform Guides',
      ribbonBody: 'This page explains public-link behavior across supported platform categories.',
    },
    AppDownload: {
      border: 'border-purple-400/20',
      accentText: 'text-purple-300',
      brand: 'from-purple-300 to-pink-300',
      badgeBg: 'bg-purple-400/10',
      badgeBorder: 'border-purple-400/25',
      ribbonTitle: 'Android App',
      ribbonBody: 'This page explains the mobile app path and signed APK expectations.',
    },
    Dashboard: {
      border: 'border-cyan-400/20',
      accentText: 'text-cyan-300',
      brand: 'from-cyan-300 to-emerald-300',
      badgeBg: 'bg-cyan-400/10',
      badgeBorder: 'border-cyan-400/25',
      ribbonTitle: 'Media Dashboard',
      ribbonBody: 'This page manages saved video, image, and audio activity separately from account settings.',
    },
    Account: {
      border: 'border-emerald-400/20',
      accentText: 'text-emerald-300',
      brand: 'from-emerald-300 to-blue-300',
      badgeBg: 'bg-emerald-400/10',
      badgeBorder: 'border-emerald-400/25',
      ribbonTitle: 'Account Settings',
      ribbonBody: 'This page covers identity, privacy, notifications, exports, and responsible saved-media habits.',
    },
    Settings: {
      border: 'border-blue-400/20',
      accentText: 'text-blue-300',
      brand: 'from-blue-300 to-emerald-300',
      badgeBg: 'bg-blue-400/10',
      badgeBorder: 'border-blue-400/25',
      ribbonTitle: 'Product Settings',
      ribbonBody: 'This page controls media preferences, quality defaults, reminders, and device-level behavior.',
    },
    Notifications: {
      border: 'border-purple-300/30',
      accentText: 'text-purple-200',
      brand: 'from-purple-200 to-white',
      badgeBg: 'bg-purple-400/10',
      badgeBorder: 'border-purple-200/35',
      ribbonTitle: 'Notification Center',
      ribbonBody: 'This page controls glowing popup alerts for web app and mobile app updates.',
    },
  };

  return themes[pageName] || themes.Home;
};

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { t } = useI18n();
  const theme = useMemo(() => getPageTheme(currentPageName), [currentPageName]);
  const showRibbon = Boolean(theme.ribbonTitle && currentPageName && currentPageName !== 'Home');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (isAuth) setUser(await downloadDash.auth.me());
      } catch {}
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <style>{`
        :root {
          --primary: 168 85% 57%;
          --background: 0 0% 0%;
          --foreground: 0 0% 100%;
          --card: 0 0% 5%;
          --card-foreground: 0 0% 100%;
          --popover: 0 0% 5%;
          --popover-foreground: 0 0% 100%;
          --muted: 0 0% 15%;
          --muted-foreground: 0 0% 65%;
          --border: 270 50% 40% / 0.3;
          --input: 270 50% 40% / 0.3;
          --ring: 270 80% 60%;
        }
        body { background: #000; color: #fff; }
        * { scrollbar-width: thin; scrollbar-color: rgba(168,85,247,.3) transparent; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(168,85,247,.3); border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,.5); }
      `}</style>

      {currentPageName !== 'Home' && (
        <Suspense fallback={null}>
          <AutoAdManager />
        </Suspense>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b ${theme.border}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Download className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xl font-bold bg-gradient-to-r ${theme.brand} bg-clip-text text-transparent`}>
                DownloadDash
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link to={createPageUrl('Home')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <Home className="h-4 w-4" /> {t('nav.home')}
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setIsPlatformsOpen(true)}
                onMouseLeave={() => setIsPlatformsOpen(false)}
              >
                <button
                  type="button"
                  className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2"
                  aria-haspopup="menu"
                  aria-expanded={isPlatformsOpen}
                  onClick={() => setIsPlatformsOpen((open) => !open)}
                >
                  <Bookmark className="h-4 w-4" />
                  Platforms
                  <ChevronDown className={`h-4 w-4 transition-transform ${isPlatformsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPlatformsOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full pt-3"
                  >
                    <div className="w-64 rounded-2xl border border-purple-500/20 bg-black/95 p-2 shadow-2xl shadow-purple-900/30 backdrop-blur-xl">
                      {platformNavItems.map(({ page, label, Icon, hover }) => (
                        <Link
                          key={page}
                          to={createPageUrl(page)}
                          role="menuitem"
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-300 ${hover} hover:bg-white/10 transition-colors`}
                          onClick={() => setIsPlatformsOpen(false)}
                        >
                          <Icon size={22} />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {user && (
                <Link to={createPageUrl('Dashboard')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                  <History className="h-4 w-4" /> {t('nav.dashboard')}
                </Link>
              )}
              <Link to={createPageUrl('Settings')} className="text-gray-300 hover:text-blue-300 transition-colors flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Settings
              </Link>
              <Link to={createPageUrl('Notifications')} className="text-gray-300 hover:text-purple-200 transition-colors flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifications
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <LanguageSelector />
              {user ? (
                <Link
                  to={createPageUrl('Dashboard')}
                  aria-label="Open DownloadDash dashboard"
                  title="Open DownloadDash dashboard"
                >
                  <Button variant="ghost" className="hidden sm:flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20">
                    <User className="h-4 w-4" /> {user.full_name?.split(' ')[0] || t('nav.dashboard')}
                  </Button>
                </Link>
              ) : (
                <Button onClick={() => downloadDash.auth.redirectToLogin()} className="hidden sm:flex bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                  <LogIn className="mr-2 h-4 w-4" /> {t('nav.login')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-purple-400"
                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                title={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {showRibbon && (
          <div className={`border-t ${theme.border} bg-black/60`}>
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-xs uppercase tracking-[0.24em] ${theme.accentText}`}>{theme.ribbonTitle}</p>
                <p className="text-sm text-gray-400">{theme.ribbonBody}</p>
              </div>
              <div className={`shrink-0 rounded-full px-3 py-1 text-xs ${theme.badgeBg} ${theme.badgeBorder} border ${theme.accentText}`}>
                {currentPageName}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
            <div className="lg:hidden border-t border-purple-500/20 bg-black/95">
              <nav className="px-4 py-4 space-y-2">
                <Link to={createPageUrl('Home')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Home className="h-5 w-5" /> {t('nav.home')}
                </Link>
                {platformNavItems.map(({ page, label, Icon, mobileHover }) => (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white ${mobileHover}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon size={24} /> {label}
                  </Link>
                ))}
                <Link to={createPageUrl('Troubleshooting')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <LifeBuoy className="h-5 w-5" /> {t('nav.troubleshooting')}
                </Link>
                {user ? (
                  <>
                  <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                    <User className="h-5 w-5" /> {t('nav.dashboard')}
                  </Link>
                  </>
                ) : (
                  <Button onClick={() => { downloadDash.auth.redirectToLogin(); setIsMenuOpen(false); }} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                    <LogIn className="mr-2 h-4 w-4" /> {t('nav.loginSignup')}
                  </Button>
                )}
                <Link to={createPageUrl('Settings')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-blue-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Settings2 className="h-5 w-5" /> Settings
                </Link>
                <Link to={createPageUrl('Notifications')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Bell className="h-5 w-5" /> Notifications
                </Link>
              </nav>
            </div>
          )}
      </header>

      <main className="min-h-[calc(100vh-4rem)]">{children}</main>

      <footer className="bg-gradient-to-t from-purple-900/20 to-black border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">DownloadDash</span>
              </div>
              <p className="text-gray-400 text-sm">{t('footer.description')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">{t('nav.resources')}</h3>
              <div className="space-y-2">
                {platformNavItems.map(({ page, label, Icon, hover }) => (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    className={`flex items-center gap-2 text-gray-400 ${hover} text-sm transition-colors`}
                  >
                    <Icon size={18} /> {label} Downloader
                  </Link>
                ))}
                <Link to={createPageUrl('AppDownload')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <Download className="h-4 w-4" /> {t('nav.androidApp')}
                </Link>
                <Link to={createPageUrl('HowDownloadDashWorks')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <FileText className="h-4 w-4" /> {t('nav.howItWorks')}
                </Link>
                <Link to={createPageUrl('SupportedPlatforms')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <Bookmark className="h-4 w-4" /> {t('nav.supportedPlatforms')}
                </Link>
                <Link to={createPageUrl('Troubleshooting')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <LifeBuoy className="h-4 w-4" /> {t('nav.troubleshooting')}
                </Link>
                <Link to={createPageUrl('Blog')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <LifeBuoy className="h-4 w-4" /> {t('nav.blog')}
                </Link>
                <Link to={createPageUrl('ResponsibleUse')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <ShieldCheck className="h-4 w-4" /> {t('nav.responsibleUse')}
                </Link>
                <Link to={createPageUrl('TrustCenter')} className="flex items-center gap-2 text-gray-400 hover:text-emerald-300 text-sm transition-colors">
                  <ShieldCheck className="h-4 w-4" /> {t('nav.trustCenter')}
                </Link>
                <Link to={createPageUrl('HelpCenter')} className="flex items-center gap-2 text-gray-400 hover:text-cyan-300 text-sm transition-colors">
                  <LifeBuoy className="h-4 w-4" /> {t('nav.helpCenter')}
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">{t('nav.links')}</h3>
              <div className="space-y-2">
                <Link to={createPageUrl('Home')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.home')}</Link>
                <Link to={createPageUrl('Dashboard')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.dashboard')}</Link>
                <Link to={createPageUrl('Settings')} className="block text-gray-400 hover:text-blue-300 text-sm">Settings</Link>
                <Link to={createPageUrl('Notifications')} className="block text-gray-400 hover:text-purple-200 text-sm">Notifications</Link>
                <Link to={createPageUrl('RecommendedApps')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.guides')}</Link>
                <Link to={createPageUrl('HowDownloadDashWorks')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.howItWorks')}</Link>
                <Link to={createPageUrl('SupportedPlatforms')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.supportedPlatforms')}</Link>
                <Link to={createPageUrl('Troubleshooting')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.troubleshooting')}</Link>
                <Link to={createPageUrl('ResponsibleUse')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.responsibleUse')}</Link>
                <Link to={createPageUrl('TrustCenter')} className="block text-gray-400 hover:text-emerald-300 text-sm">{t('nav.trustCenter')}</Link>
                <Link to={createPageUrl('HelpCenter')} className="block text-gray-400 hover:text-cyan-300 text-sm">{t('nav.helpCenter')}</Link>
                <Link to={createPageUrl('SystemStatus')} className="block text-gray-400 hover:text-emerald-300 text-sm">{t('nav.systemStatus')}</Link>
                <Link to={createPageUrl('PlatformGuides')} className="block text-gray-400 hover:text-amber-300 text-sm">{t('nav.platformGuides')}</Link>
                <Link to={createPageUrl('Updates')} className="block text-gray-400 hover:text-violet-300 text-sm">{t('nav.updates')}</Link>
                <Link to={createPageUrl('SafetyCenter')} className="block text-gray-400 hover:text-emerald-300 text-sm">{t('nav.safetyCenter')}</Link>
                <Link to={createPageUrl('DMCA')} className="block text-gray-400 hover:text-emerald-300 text-sm">DMCA</Link>
                <Link to={createPageUrl('FAQ')} className="block text-gray-400 hover:text-emerald-300 text-sm">{t('nav.faq')}</Link>
                <Link to={createPageUrl('Blog')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.blog')}</Link>
                <Link to={createPageUrl('PrivacyPolicy')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.privacyPolicy')}</Link>
                <Link to={createPageUrl('TermsOfService')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.terms')}</Link>
                <Link to={createPageUrl('Disclaimer')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.disclaimer')}</Link>
                <Link to={createPageUrl('Contact')} className="block text-gray-400 hover:text-purple-400 text-sm">{t('nav.contact')}</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-purple-500/20 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">{t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
