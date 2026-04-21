import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Link as LinkIcon, Loader2, CheckCircle,
  AlertCircle, Bookmark, Shield, Film, Volume2, Image, Crown, Zap, Target, Lock, Eye, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from './AdBanner';
import RewardedAdModal from './Ads/RewardedAdModal';
import SkippableAdModal from './Ads/SkippableAdModal';
import ShortAdModal from './Ads/ShortAdModal';

// Platform URL validation
const urlPatterns = {
  tiktok: /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(p|reel|stories|tv)\/.+/i,
  facebook: /^https?:\/\/(www\.|m\.|web\.)?facebook\.com\/(watch|video|reel|story)\/.+|^https?:\/\/fb\.watch\/.+/i,
  twitter: /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+\/status\/.+/i,
  youtube: /^https?:\/\/(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/).+/i,
  telegram: /^https?:\/\/(t\.me|telegram\.me)\/.+/i,
  snapchat: /^https?:\/\/(www\.)?snapchat\.com\/(spotlight|add|story)\/.+/i,
  pinterest: /^https?:\/\/(www\.)?pinterest\.(com|co\.uk|ca|de|fr)\/(pin|video)\/.+/i,
  reddit: /^https?:\/\/(www\.|old\.)?reddit\.com\/r\/.+\/(comments|s)\/.+/i,
  whatsapp: /^https?:\/\/.+/i,
};

const sanitizeUrl = (url) => {
  let s = url.trim();
  s = s.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '');
  return s;
};

const validateUrl = (url, platform) => {
  if (!url || url.length < 10 || url.length > 2048) return { valid: false, error: 'Please enter a valid URL' };
  const sanitized = sanitizeUrl(url);
  try { new URL(sanitized); } catch { return { valid: false, error: 'Invalid URL format' }; }
  const pattern = urlPatterns[platform];
  if (pattern && !pattern.test(sanitized)) return { valid: false, error: `Please enter a valid ${platform} URL` };
  return { valid: true, url: sanitized };
};

// Ad type per download quality
const AD_TYPE = {
  videoHD:  'rewarded',   // must watch full
  videoSD:  'skippable',  // skip after 5s
  audio:    'short',      // 3s auto
  image:    'skippable',  // skip after 5s
};

export default function DownloaderTemplate({
  platform,
  platformName,
  platformIcon,
  gradientFrom,
  gradientTo,
  supportedTypes = ['Videos', 'Stories', 'Images'],
  placeholderUrl = 'Paste your link here...',
  user
}) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  // Which ad is active and what to do after
  const [activeAd, setActiveAd] = useState(null); // 'rewarded' | 'skippable' | 'short'
  const [pendingDownload, setPendingDownload] = useState(null);
  const [pendingLabel, setPendingLabel] = useState('');

  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFetch = async () => {
    const validation = validateUrl(url, platform);
    if (!validation.valid) { setError(validation.error); return; }
    setIsLoading(true);
    setError('');
    setResult(null);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 200);

    try {
      const response = await downloadDash.functions.invoke('downloadVideo', { url: validation.url, platform });
      clearInterval(progressInterval);
      setProgress(100);
      if (!response.success) throw new Error(response.error || 'Failed to process link');
      setResult(response);
      if (user?.email) {
        await downloadDash.entities.DownloadHistory.create({
          user_email: user.email,
          platform,
          content_type: response.type || 'video',
          original_url: validation.url,
          download_url: response.downloads?.videoHD || response.downloads?.image,
          thumbnail_url: response.thumbnail,
          title: response.title
        }).catch(() => {});
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Failed to fetch content. Please check the URL and try again.');
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  const startDownload = async (downloadUrl, type) => {
    if (!downloadUrl) return;

    try {
      // Show loading indicator
      setIsLoading(true);
      setIsDownloading(true);

      // Generate filename with DownloadDash prefix and 10 random digits
      const randomDigits = Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number
      const ext = type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : 'mp4';
      const filename = `DownloadDash${randomDigits}.${ext}`;

      // Use the client's downloadToDevice function which handles CORS and proxy fallback
      await downloadDash.downloadToDevice(downloadUrl, filename);

      // Check if mobile device (limited download support)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        alert(`Download started on mobile: ${filename}\nIf it opens instead of downloading, use your browser's download option.`);
      } else {
        alert(`Download started: ${filename}`);
      }

      // Hide loading indicator
      setIsLoading(false);
      setIsDownloading(false);

    } catch (error) {
      console.error('Download failed:', error);
      setIsLoading(false);
      setIsDownloading(false);

      // Show error message instead of opening in new tab
      alert(`Download failed: ${error.message || 'Unknown error'}. Please try again.`);
      // Don't open in new tab - let user retry the download
    }
  };

  const requestDownload = (downloadUrl, type, label) => {
    const adType = AD_TYPE[type] || 'skippable';
    setPendingDownload({ downloadUrl, type });
    setPendingLabel(label);
    setActiveAd(adType);
  };

  const handleAdComplete = () => {
    setActiveAd(null);
    if (pendingDownload) {
      startDownload(pendingDownload.downloadUrl, pendingDownload.type);
      setPendingDownload(null);
    }
  };

  const handleSave = async () => {
    if (!user?.email || !result) return;
    await downloadDash.entities.SavedContent.create({
      user_email: user.email, platform,
      content_type: result.type,
      content_url: result.downloads?.videoHD || result.downloads?.image,
      thumbnail_url: result.thumbnail,
      title: result.title
    }).catch(() => {});
    alert('Saved to your collection!');
  };

  const hasVideoHD = !!result?.downloads?.videoHD;
  const hasVideoSD = !!result?.downloads?.videoSD;
  const hasAudio = !!result?.downloads?.audio;
  const hasVideoOrAudio = hasVideoHD || hasVideoSD || hasAudio;

  const downloadOptionsVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const downloadOptionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ad modals – only ONE is shown at a time, preventing AdSense/AdMob collision */}
      <RewardedAdModal
        isOpen={activeAd === 'rewarded'}
        onComplete={handleAdComplete}
        downloadLabel={pendingLabel}
      />
      <SkippableAdModal
        isOpen={activeAd === 'skippable'}
        onComplete={handleAdComplete}
        downloadLabel={pendingLabel}
      />
      <ShortAdModal
        isOpen={activeAd === 'short'}
        onComplete={handleAdComplete}
      />

      {/* Download Progress Indicator */}
      {isDownloading && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Downloading...</span>
        </motion.div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AdBanner position="top" size="medium" />
        <div className="mt-4">
          <AdBanner position="top" size="small" />
        </div>

        {/* Platform Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
          <motion.div
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {platformIcon}
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            {platformName} Downloader
          </h1>
          <p className="text-gray-400 text-lg mb-3">Download videos, stories, and images without watermark</p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {supportedTypes.map((t, i) => (
              <span key={i} className="px-4 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm">{t}</span>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <LinkIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">1. Paste URL</h3>
              <p className="text-gray-500 text-sm">Copy the {platformName} video link</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Download className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">2. Process</h3>
              <p className="text-gray-500 text-sm">We fetch the content securely</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Film className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">3. Download</h3>
              <p className="text-gray-500 text-sm">Choose quality and download</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 md:p-8 border border-purple-500/20"
        >
          <div className="flex items-center gap-2 text-green-400 text-sm mb-4 justify-center">
            <Shield className="h-4 w-4" />
            <span>Public links only • No login required • 100% Secure</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 h-5 w-5" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder={placeholderUrl}
                className="pl-12 h-14 bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 rounded-xl text-lg"
                maxLength={2048}
              />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleFetch}
                disabled={isLoading}
                className={`h-14 px-8 bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25`}
              >
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing…</> : <><Download className="mr-2 h-5 w-5" />Process</>}
              </Button>
            </motion.div>
          </div>

          {/* Ad between input and results */}
          <div className="mt-6">
            <AdBanner position="middle" size="medium" />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4"
              >
                <div className="flex items-center gap-3 text-purple-400 mb-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing your {platformName} content...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-6 p-6 bg-gradient-to-br from-purple-900/30 to-black rounded-2xl border border-purple-500/30"
              >
                <div className="flex items-center gap-2 text-green-400 mb-5">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Content Found! Choose your download:</span>
                </div>

                {/* Preview Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(true)}
                  className="mb-4 flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Preview Content
                </motion.button>

                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {result.thumbnail && (
                    <div className="w-full md:w-40 h-28 md:h-28 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                      <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">{result.title || `${platformName} Content`}</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                      <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> No Watermark</span>
                      <span>•</span>
                      <span className="capitalize">{result.type || 'video'}</span>
                    </div>
                  </div>
                </div>

                {/* Download Options */}
                <motion.div
                  className="grid gap-3"
                  variants={downloadOptionsVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {hasVideoOrAudio ? (
                    <>
                      {/* HD Video — full rewarded ad */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(result.downloads?.videoHD, 'videoHD', 'HD Video')}
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/40 hover:border-purple-500/70 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                            <Crown className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-white">HD Download</p>
                            <p className="text-xs text-gray-400">Best quality • No watermark</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full">Watch Full Ad</span>
                        </div>
                      </motion.button>

                      {/* SD Video — skippable after 5s */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(result.downloads?.videoSD, 'videoSD', 'SD Video')}
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-700/60 hover:border-purple-500/40 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <Film className="h-5 w-5 text-gray-300" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">SD Download</p>
                            <p className="text-xs text-gray-400">Standard quality • No watermark</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">Skip after 5s</span>
                        </div>
                      </motion.button>

                      {/* Audio — very short 3s ad */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(result.downloads?.audio, 'audio', 'Audio MP3')}
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-700/60 hover:border-green-500/40 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-900/60 flex items-center justify-center flex-shrink-0">
                            <Volume2 className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">Audio / MP3</p>
                            <p className="text-xs text-gray-400">Extract sound only</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">3s quick ad</span>
                        </div>
                      </motion.button>
                    </>
                  ) : (
                    /* Image — skippable after 5s */
                    <motion.button
                      variants={downloadOptionVariants}
                      whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => requestDownload(result.downloads?.image, 'image', 'HD Photo')}
                      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/40 hover:border-blue-500/70 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                          <Image className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white">Download Photo (HD)</p>
                          <p className="text-xs text-gray-400">Full resolution image</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">Skip after 5s</span>
                      </div>
                    </motion.button>
                  )}

                  {/* Save to Collection */}
                  {user && (
                    <motion.button
                      variants={downloadOptionVariants}
                      whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)' }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSave}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/30 hover:border-yellow-500/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                        <Bookmark className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white">Save to Collection</p>
                        <p className="text-xs text-gray-400">Save to your dashboard</p>
                      </div>
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Ad between results and feature pills */}
        <div className="mt-8">
          <AdBanner position="middle" size="large" />
        </div>

        {/* Feature pills */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { icon: <Zap className="h-6 w-6 text-yellow-400" />, bg: 'bg-yellow-500/10', title: 'Fast Downloads', desc: 'Lightning-fast processing' },
            { icon: <Target className="h-6 w-6 text-purple-400" />, bg: 'bg-purple-500/10', title: 'No Watermark', desc: 'Clean, original quality' },
            { icon: <Lock className="h-6 w-6 text-green-400" />, bg: 'bg-green-500/10', title: 'Secure', desc: 'Public links only, no login' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10 text-center">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${f.bg} flex items-center justify-center`}>{f.icon}</div>
              <h4 className="font-semibold text-white">{f.title}</h4>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">Is it free to use?</h3>
              <p className="text-gray-500 text-sm">Yes! Our service is completely free. We only show short ads to support our costs.</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">What formats are supported?</h3>
              <p className="text-gray-500 text-sm">We support HD/SD video downloads, audio extraction (MP3), and high-quality images.</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">Is it safe and secure?</h3>
              <p className="text-gray-500 text-sm">Absolutely! We only process public links and don't store your personal data.</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">How fast are the downloads?</h3>
              <p className="text-gray-500 text-sm">Downloads start immediately after processing. Speed depends on your internet connection.</p>
            </div>
          </div>
        </motion.div>

        <div className="mt-8">
          <AdBanner position="bottom" size="large" />
        </div>
        <div className="mt-4">
          <AdBanner position="bottom" size="medium" />
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-purple-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-bold truncate">{result.title || `${platformName} Content`}</h3>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              {result.thumbnail && (
                <div className="relative mb-4">
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full rounded-xl object-cover max-h-96"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center cursor-pointer"
                      onClick={() => window.open(result.original_url || url, '_blank')}
                    >
                      <Play className="h-8 w-8 text-white ml-1" />
                    </motion.div>
                  </div>
                </div>
              )}
              <div className="text-gray-400 text-sm">
                <p>Platform: {platformName}</p>
                <p>Type: {result.type || 'video'}</p>
                {result.duration && <p>Duration: {result.duration}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
