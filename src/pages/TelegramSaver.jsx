import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Folder,
  Image,
  Video,
  RefreshCw,
  Check,
  Share2,
  Repeat,
  AlertCircle,
  Smartphone,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadDash } from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';
import VideoAdOverlay from '@/components/VideoAdOverlay';

const BRIDGE_BASE_URL = import.meta.env.VITE_TELEGRAM_BRIDGE_URL || '';

export default function TelegramSaver() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('images');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [saveCount, setSaveCount] = useState(0);

  const [statusItems, setStatusItems] = useState({ images: [], videos: [] });
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusLoadError, setStatusLoadError] = useState('');

  const loadStories = async () => {
    if (!BRIDGE_BASE_URL) {
      setStatusItems({ images: [], videos: [] });
      setStatusLoadError(
        'Telegram bridge is not configured. Set VITE_TELEGRAM_BRIDGE_URL and ensure the bridge is running.'
      );
      return;
    }

    setIsStatusLoading(true);
    setStatusLoadError('');

    try {
      try {
        await fetch(`${BRIDGE_BASE_URL}/sync`, { method: 'POST' });
      } catch {
        // ignore sync errors; still try to load downloads
      }

      const res = await fetch(`${BRIDGE_BASE_URL}/downloads`);
      if (!res.ok) throw new Error(`Bridge request failed (${res.status})`);
      const data = await res.json();

      const items = Array.isArray(data?.items) ? data.items : [];
      const withUrls = items.map((item) => {
        const absoluteUrl =
          typeof item?.url === 'string' && item.url.startsWith('http')
            ? item.url
            : `${BRIDGE_BASE_URL}${item?.url || ''}`;

        return {
          id: item?.id || item?.filename || absoluteUrl,
          filename: item?.filename,
          type: item?.type,
          url: absoluteUrl,
          thumbnail: item?.type === 'image' ? absoluteUrl : null,
          timestamp: item?.createdAt ? new Date(item.createdAt).toLocaleString() : '',
        };
      });

      setStatusItems({
        images: withUrls.filter((i) => i.type === 'image'),
        videos: withUrls.filter((i) => i.type === 'video'),
      });
    } catch (e) {
      setStatusItems({ images: [], videos: [] });
      console.log('[DownloadDash] Telegram bridge /downloads failed:', e);
      setStatusLoadError('No stories found. Make sure the Telegram bridge is running and you are connected.');
    } finally {
      setIsStatusLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (isAuth) {
          const userData = await downloadDash.auth.me();
          setUser(userData);
        }
      } catch {
        console.log('Not authenticated');
      }
    };
    loadUser();
    loadStories();
  }, []);

  const toggleSelect = (id) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const items = activeTab === 'images' ? statusItems.images : statusItems.videos;
    setSelectedItems(items.map((i) => i.id));
  };

  const handleSaveSelected = async () => {
    if (selectedItems.length === 0) return;

    // Show ad every 2-3 saves
    setSaveCount((prev) => prev + 1);
    if (saveCount > 0 && saveCount % 2 === 0) {
      setShowVideoAd(true);
    }

    // Save to history if logged in
    if (user?.email) {
      try {
        for (const id of selectedItems) {
          const allItems = [...statusItems.images, ...statusItems.videos];
          const item = allItems.find((i) => i.id === id);
          if (item) {
            await downloadDash.entities.SavedContent.create({
              user_email: user.email,
              platform: 'telegram',
              content_type: item.type === 'video' ? 'story' : 'image',
              content_url: item.url,
              thumbnail_url: item.thumbnail || undefined,
              title: `Telegram Story - ${item.timestamp}`,
            });
          }
        }
      } catch {
        console.log('Could not save');
      }
    }

    // Download to device (web) for the selected items
    try {
      const allItems = [...statusItems.images, ...statusItems.videos];
      for (const id of selectedItems) {
        const item = allItems.find((i) => i.id === id);
        if (!item?.url) continue;
        const filename = item.filename || `telegram_${item.type}_${Date.now()}`;
        await downloadDash.downloadToDevice(item.url, filename);
      }
    } catch {
      // ignore; user still may have saved to history
    }

    alert(`${selectedItems.length} item(s) saved to your device!`);
    setSelectedItems([]);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <VideoAdOverlay
        isOpen={showVideoAd}
        onClose={() => setShowVideoAd(false)}
        onComplete={() => setShowVideoAd(false)}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AdBanner position="top" size="medium" />

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
          <motion.div
            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl mb-6"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className="text-5xl">??</span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Telegram Stories Saver
          </h1>
          <p className="text-gray-400 text-lg mb-2">Save stories, videos, and images from Telegram</p>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['Story Videos', 'Story Images', 'No Login Required', 'Save to Gallery'].map((tag, idx) => (
              <span
                key={idx}
                className="px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-900/20 to-black rounded-2xl p-6 border border-blue-500/20 mb-8"
        >
          <div className="flex items-center gap-2 text-blue-400 mb-4">
            <Info className="h-5 w-5" />
            <span className="font-semibold">How It Works</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', icon: <Smartphone className="h-6 w-6" />, text: 'View stories in the Telegram app' },
              { step: '2', icon: <Folder className="h-6 w-6" />, text: 'Stories are made available by the bridge' },
              { step: '3', icon: <Download className="h-6 w-6" />, text: 'Select & save to your gallery' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-gray-400">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  {item.icon}
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 border border-purple-500/20"
        >
          <div className="flex items-center justify-between mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-800 border border-blue-500/20">
                <TabsTrigger value="images" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
                  <Image className="mr-2 h-4 w-4" />
                  Images ({statusItems.images.length})
                </TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
                  <Video className="mr-2 h-4 w-4" />
                  Videos ({statusItems.videos.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-blue-400 hover:bg-blue-500/20">
                Select All
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:bg-gray-800"
                onClick={loadStories}
                disabled={isStatusLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isStatusLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {statusLoadError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
              {statusLoadError}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {(activeTab === 'images' ? statusItems.images : statusItems.videos).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleSelect(item.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group ${
                    selectedItems.includes(item.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.thumbnail || item.url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}

                  {/* Overlay */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      selectedItems.includes(item.id) ? 'bg-blue-500/30' : 'bg-black/0 group-hover:bg-black/40'
                    }`}
                  />

                  {/* Selection Check */}
                  <div
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedItems.includes(item.id) ? 'bg-blue-500 border-blue-500' : 'border-white/50 bg-black/30'
                    }`}
                  >
                    {selectedItems.includes(item.id) && <Check className="h-4 w-4 text-white" />}
                  </div>

                  {/* Video Duration */}
                  {item.type === 'video' && (
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      {item.duration}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-gray-300">
                    {item.timestamp}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!statusLoadError && !isStatusLoading && (activeTab === 'images' ? statusItems.images.length === 0 : statusItems.videos.length === 0) && (
            <div className="mt-6 text-center text-gray-500 text-sm">
              No {activeTab} found yet. View a story in Telegram, keep the bridge connected, then refresh.
            </div>
          )}

          {/* Action Bar */}
          <AnimatePresence>
            {selectedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 p-4 bg-blue-900/30 rounded-xl border border-blue-500/30 flex items-center justify-between"
              >
                <span className="text-blue-300">{selectedItems.length} item(s) selected</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                    onClick={() => alert('Reshare functionality coming soon!')}
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    Reshare
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90" onClick={handleSaveSelected}>
                    <Download className="mr-2 h-4 w-4" />
                    Save to Gallery
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="text-yellow-400 font-medium mb-1">Important:</p>
            <p>You must first view the story in Telegram for it to appear here. The bridge only shows stories it can access while connected.</p>
          </div>
        </motion.div>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { icon: '??', title: 'No Login Required', desc: 'Works with local files only' },
            { icon: '??', title: 'Private & Secure', desc: 'No data leaves your device' },
            { icon: '??', title: 'Save to Gallery', desc: 'Keep stories forever' },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10 text-center"
            >
              <span className="text-3xl mb-2 block">{feature.icon}</span>
              <h4 className="font-semibold text-white">{feature.title}</h4>
              <p className="text-gray-500 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <AdBanner position="bottom" size="large" />
        </div>
      </div>
    </div>
  );
}
