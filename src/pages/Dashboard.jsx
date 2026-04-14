import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { History, Bookmark, Download, Trash2, ExternalLink, LogOut, User as UserIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';

const platformIcons = {
  tiktok: '🎵',
  instagram: '📸',
  facebook: '👤',
  twitter: '🐦',
  whatsapp: '💬',
  telegram: '✈️',
  snapchat: '👻',
  youtube: '▶️',
  pinterest: '📌',
  reddit: '🤖',
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [savedContent, setSavedContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (!isAuth) {
          downloadDash.auth.redirectToLogin();
          return;
        }

        const userData = await downloadDash.auth.me();
        setUser(userData);

        const [historyData, savedData] = await Promise.all([
          downloadDash.entities.DownloadHistory.filter({ user_email: userData.email }, '-created_date', 50),
          downloadDash.entities.SavedContent.filter({ user_email: userData.email }, '-created_date', 50)
        ]);
        setDownloadHistory(historyData || []);
        setSavedContent(savedData || []);
      } catch (err) {
        console.log('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDeleteHistory = async (id) => {
    try {
      await downloadDash.entities.DownloadHistory.delete(id);
      setDownloadHistory(prev => prev.filter(item => item.id !== id));
    } catch {
      console.log('Error deleting');
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await downloadDash.entities.SavedContent.delete(id);
      setSavedContent(prev => prev.filter(item => item.id !== id));
    } catch {
      console.log('Error deleting');
    }
  };

  const handleLogout = () => {
    downloadDash.auth.logout();
  };

  const filterItems = (items) => {
    return items.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.platform?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
      return matchesSearch && matchesPlatform;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Welcome back, {user?.full_name || 'User'}!
            </h1>
            <p className="text-gray-400 mt-1">{user?.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Download className="h-5 w-5" />, label: 'Total Downloads', value: downloadHistory.length },
            { icon: <Bookmark className="h-5 w-5" />, label: 'Saved Items', value: savedContent.length },
            { icon: <History className="h-5 w-5" />, label: 'This Week', value: downloadHistory.filter(d => new Date(d.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length },
            { icon: <UserIcon className="h-5 w-5" />, label: 'Member Since', value: user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'Today' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-purple-500/20"
            >
              <div className="text-purple-400 mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search downloads..."
              className="pl-10 bg-gray-900 border-purple-500/30 text-white"
            />
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-gray-900 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Platforms</option>
            {Object.keys(platformIcons).map(platform => (
              <option key={platform} value={platform}>
                {platformIcons[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="bg-gray-900 border border-purple-500/20">
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              <History className="mr-2 h-4 w-4" />
              Download History
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Saved Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <div className="space-y-4">
              <AnimatePresence>
                {filterItems(downloadHistory).length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No download history yet</p>
                    <Link to={createPageUrl('Home')}>
                      <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                        Start Downloading
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filterItems(downloadHistory).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-purple-500/20 flex items-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-2xl">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          platformIcons[item.platform] || '📁'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{platformIcons[item.platform]} {item.platform}</span>
                          <span>•</span>
                          <span>{item.content_type}</span>
                          <span>•</span>
                          <span>{new Date(item.created_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                          onClick={() => window.open(item.original_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => handleDeleteHistory(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-4">
              <AnimatePresence>
                {filterItems(savedContent).length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No saved content yet</p>
                    <p className="text-gray-600 text-sm mt-2">Save your favorite downloads to access them later</p>
                  </div>
                ) : (
                  filterItems(savedContent).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-purple-500/20 flex items-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-2xl">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          platformIcons[item.platform] || '📁'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{platformIcons[item.platform]} {item.platform}</span>
                          <span>•</span>
                          <span>{item.content_type}</span>
                        </div>
                        {item.notes && (
                          <p className="text-gray-600 text-sm mt-1 truncate">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                          onClick={() => window.open(item.content_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => handleDeleteSaved(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}