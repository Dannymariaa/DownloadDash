import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Download, User, LogIn, Bookmark, History, Smartphone } from 'lucide-react';
import { YouTubeIcon } from '@/components/PlatformIcons';
import { Button } from '@/components/ui/button';
import downloadDash from '@/api/downloadDashClient';
import LanguageSelector from '@/components/LanguageSelector';
import AutoAdManager from '@/components/Ads/AutoAdManager.jsx';

export default function Layout({ children, currentPageName: _currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en');

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
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Download className="h-5 w-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                <Bookmark className="h-4 w-4" /> Apps
              </Link>
              <Link to={createPageUrl('DownloadApp')} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Mobile App
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
                  <Bookmark className="h-5 w-5" /> Recommended Apps
                </Link>
                <Link to={createPageUrl('DownloadApp')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/20" onClick={() => setIsMenuOpen(false)}>
                  <Smartphone className="h-5 w-5" /> Mobile App
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
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <div className="space-y-2">
                <Link to={createPageUrl('YouTubeDownloader')} className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors">
                  <YouTubeIcon size={18} /> YouTube Downloader
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Links</h4>
              <div className="space-y-2">
                <Link to={createPageUrl('Home')} className="block text-gray-400 hover:text-purple-400 text-sm">Home</Link>
                <Link to={createPageUrl('Dashboard')} className="block text-gray-400 hover:text-purple-400 text-sm">Dashboard</Link>
                <Link to={createPageUrl('RecommendedApps')} className="block text-gray-400 hover:text-purple-400 text-sm">Recommended Apps</Link>
                <Link to={createPageUrl('DownloadApp')} className="block text-gray-400 hover:text-purple-400 text-sm">Download Mobile App</Link>
                <Link to={createPageUrl('PrivacyPolicy')} className="block text-gray-400 hover:text-purple-400 text-sm">Privacy Policy</Link>
                <Link to={createPageUrl('TermsOfService')} className="block text-gray-400 hover:text-purple-400 text-sm">Terms of Service</Link>
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
