import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Download, User, LogIn, Bookmark, History, FileText, LifeBuoy, ShieldCheck } from 'lucide-react';
import { YouTubeIcon } from '@/components/PlatformIcons';
import { Button } from '@/components/ui/button';
import downloadDash from '@/api/downloadDashClient';
import LanguageSelector from '@/components/LanguageSelector';
import AutoAdManager from '@/components/Ads/AutoAdManager.jsx';

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
  };

  return themes[pageName] || themes.Home;
};

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en');
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

      {/* Global auto interstitial – only one ad system active at a time via useAdPlatform */}
      <AutoAdManager />

      {/* Header */}
      <header className={`sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b ${theme.border}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Download className="h-5 w-5 text-white" />
              </motion.div>
              <span className={`text-xl font-bold bg-gradient-to-r ${theme.brand} bg-clip-text text-transparent`}>
                DownloadDash
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link to={createPageUrl('Home')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <Home className="h-4 w-4" /> Home
              </Link>

              <Link to={createPageUrl('YouTubeDownloader')} className="text-gray-300 hover:text-red-400 transition-colors flex items-center gap-2">
                <YouTubeIcon size={20} /> YouTube
              </Link>

              <Link to={createPageUrl('RecommendedApps')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <Bookmark className="h-4 w-4" /> Guides
              </Link>
              <Link to={createPageUrl('HowDownloadDashWorks')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <FileText className="h-4 w-4" /> How It Works
              </Link>
              <Link to={createPageUrl('Blog')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <LifeBuoy className="h-4 w-4" /> Blog
              </Link>
              {user && (
                <Link to={createPageUrl('Dashboard')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                  <History className="h-4 w-4" /> Dashboard
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3">
              <LanguageSelector currentLang={language} onLanguageChange={setLanguage} />
              {user ? (
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20">
                    <User className="h-4 w-4" /> {user.full_name?.split(' ')[0] || 'Account'}
                  </Button>
                </Link>
              ) : (
                <Button onClick={() => downloadDash.auth.redirectToLogin()} className="hidden sm:flex bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              )}
              <Button variant="ghost" size="icon" className="lg:hidden text-purple-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-purple-500/20 bg-black/95">
              <nav className="px-4 py-4 space-y-2">
                <Link to={createPageUrl('Home')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Home className="h-5 w-5" /> Home
                </Link>
                <Link to={createPageUrl('YouTubeDownloader')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-red-500/20" onClick={() => setIsMenuOpen(false)}>
                  <YouTubeIcon size={24} /> YouTube Downloader
                </Link>
                <Link to={createPageUrl('RecommendedApps')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Bookmark className="h-5 w-5" /> Guides
                </Link>
                <Link to={createPageUrl('HowDownloadDashWorks')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <FileText className="h-5 w-5" /> How It Works
                </Link>
                <Link to={createPageUrl('Troubleshooting')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <LifeBuoy className="h-5 w-5" /> Troubleshooting
                </Link>
                <Link to={createPageUrl('Blog')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <LifeBuoy className="h-5 w-5" /> Blog
                </Link>
                {user ? (
                  <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                    <User className="h-5 w-5" /> Dashboard
                  </Link>
                ) : (
                  <Button onClick={() => { downloadDash.auth.redirectToLogin(); setIsMenuOpen(false); }} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                    <LogIn className="mr-2 h-4 w-4" /> Login / Sign Up
                  </Button>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
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
              <p className="text-gray-400 text-sm">A simple media utility for public links, personal use, and content you have permission to save.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <div className="space-y-2">
                <Link to={createPageUrl('YouTubeDownloader')} className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors">
                  <YouTubeIcon size={18} /> YouTube Downloader
                </Link>
                <Link to={createPageUrl('HowDownloadDashWorks')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <FileText className="h-4 w-4" /> How DownloadDash Works
                </Link>
                <Link to={createPageUrl('SupportedPlatforms')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <Bookmark className="h-4 w-4" /> Supported Platforms
                </Link>
                <Link to={createPageUrl('Troubleshooting')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <LifeBuoy className="h-4 w-4" /> Troubleshooting
                </Link>
                <Link to={createPageUrl('Blog')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <LifeBuoy className="h-4 w-4" /> Blog
                </Link>
                <Link to={createPageUrl('ResponsibleUse')} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  <ShieldCheck className="h-4 w-4" /> Responsible Use
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Links</h4>
              <div className="space-y-2">
                <Link to={createPageUrl('Home')} className="block text-gray-400 hover:text-purple-400 text-sm">Home</Link>
                <Link to={createPageUrl('Dashboard')} className="block text-gray-400 hover:text-purple-400 text-sm">Dashboard</Link>
                <Link to={createPageUrl('RecommendedApps')} className="block text-gray-400 hover:text-purple-400 text-sm">Guides</Link>
                <Link to={createPageUrl('HowDownloadDashWorks')} className="block text-gray-400 hover:text-purple-400 text-sm">How DownloadDash Works</Link>
                <Link to={createPageUrl('SupportedPlatforms')} className="block text-gray-400 hover:text-purple-400 text-sm">Supported Platforms</Link>
                <Link to={createPageUrl('Troubleshooting')} className="block text-gray-400 hover:text-purple-400 text-sm">Troubleshooting</Link>
                <Link to={createPageUrl('ResponsibleUse')} className="block text-gray-400 hover:text-purple-400 text-sm">Responsible Use</Link>
                <Link to={createPageUrl('Blog')} className="block text-gray-400 hover:text-purple-400 text-sm">Blog</Link>
                <Link to={createPageUrl('PrivacyPolicy')} className="block text-gray-400 hover:text-purple-400 text-sm">Privacy Policy</Link>
                <Link to={createPageUrl('TermsOfService')} className="block text-gray-400 hover:text-purple-400 text-sm">Terms of Service</Link>
                <Link to={createPageUrl('Disclaimer')} className="block text-gray-400 hover:text-purple-400 text-sm">Disclaimer</Link>
                <Link to={createPageUrl('Contact')} className="block text-gray-400 hover:text-purple-400 text-sm">Contact</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-purple-500/20 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">© 2026 DownloadDash. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
