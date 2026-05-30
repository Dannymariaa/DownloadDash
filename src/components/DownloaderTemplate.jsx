import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Link as LinkIcon, Loader2, CheckCircle,
  AlertCircle, Bookmark, Shield, Film, Volume2, Image, Crown, Zap, Target, Lock, Eye, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from './AdBanner';
import RewardedAdModal from '@/components/Ads/RewardedAdModal';
import SkippableAdModal from '@/components/Ads/SkippableAdModal';
import ShortAdModal from '@/components/Ads/ShortAdModal';
import { useI18n } from '@/lib/i18n';
import { getPlatformIcon } from '@/components/PlatformIcons';

// Platform URL validation
const urlPatterns = {
  tiktok: /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(p|reel|stories|tv)\/.+/i,
  facebook: /^https?:\/\/(www\.|m\.|mbasic\.|web\.)?facebook\.com\/.+|^https?:\/\/fb\.watch\/.+/i,
  twitter: /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+\/status\/.+/i,
  youtube: /^https?:\/\/(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/).+/i,
  telegram: /^https?:\/\/(t\.me|telegram\.me)\/.+/i,
  snapchat: /^https?:\/\/(www\.)?snapchat\.com\/(spotlight|add|story)\/.+/i,
  pinterest: /^https?:\/\/((www\.)?pinterest\.(com|co\.uk|ca|de|fr)\/.+|pin\.it\/.+)/i,
  reddit: /^https?:\/\/((www\.|old\.|new\.|m\.)?reddit\.com\/.+|redd\.it\/.+)/i,
  whatsapp: /^https?:\/\/.+/i,
};

const sanitizeUrl = (url) => {
  let s = url.trim();
  s = s.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '');
  return s;
};

const validateUrl = (url, platform, t) => {
  if (!url || url.length < 10 || url.length > 2048) return { valid: false, error: t('errors.validUrl') };
  const sanitized = sanitizeUrl(url);
  try { new URL(sanitized); } catch { return { valid: false, error: t('errors.invalidUrl') }; }
  const pattern = urlPatterns[platform];
  if (pattern && !pattern.test(sanitized)) return { valid: false, error: t('errors.platformUrl', { platform }) };
  return { valid: true, url: sanitized };
};

const platformPageContent = {
  youtube: {
    intro:
      'Use this YouTube workflow for supported public videos, Shorts, and audio references when you own the content, have permission, or are saving it for allowed personal use. Results depend on what YouTube exposes for the specific link at the time you process it.',
    highlights: [
      { title: 'Long videos and Shorts', body: 'Paste regular watch links, youtu.be links, or Shorts links and review the returned format options before saving.' },
      { title: 'Audio reference workflow', body: 'When audio is available, DownloadDash can show an audio-only option for lawful listening, review, or creator backup.' },
      { title: 'Quality-aware saving', body: 'Choose HD when quality matters, or a smaller file when you only need a quick offline reference.' },
    ],
    bestFor: ['Creator backups', 'Class notes and tutorials', 'Personal offline reference', 'Internal review clips'],
    tips: [
      'Open the original video first and confirm it is still public.',
      'Use the canonical YouTube link when a shortened or shared link fails.',
      'Remember that playlists may resolve differently from individual videos.',
      'Keep the title or source link with saved files so you can trace them later.',
    ],
  },
  tiktok: {
    intro:
      'Use this TikTok downloader page for supported public videos, photo posts, stories, and audio-led media. TikTok changes quickly, so a clean workflow keeps the original link, purpose, and creator context attached to every save.',
    highlights: [
      { title: 'Videos, photos, and stories', body: 'Process supported public TikTok links and review whatever video, image, or audio options the backend can safely return.' },
      { title: 'Trend research', body: 'Save examples for studying hooks, edits, captions, and audio patterns without treating them as content you own.' },
      { title: 'Creator archive support', body: 'Back up your own posts or approved creator assets with a clearer file naming habit.' },
    ],
    bestFor: ['Public video references', 'Creator backups', 'Audio ideas', 'Campaign research'],
    tips: [
      'Avoid private, deleted, or restricted posts because they usually cannot resolve.',
      'If a vm.tiktok.com link fails, open it and copy the full TikTok URL.',
      'Treat watermark-free files as formatting only, not permission to repost.',
      'Label saved files by project, sound, or hook so they remain useful later.',
    ],
  },
  instagram: {
    intro:
      'Use this Instagram page for supported public reels, posts, images, and story-style links. Instagram media is often tied to captions, creators, audio, and account visibility, so context matters as much as the file.',
    highlights: [
      { title: 'Reels and public posts', body: 'Paste public Instagram reels or post links and choose from available media options returned by the service.' },
      { title: 'Image and carousel research', body: 'Save supported visual references for design, education, planning, or personal collections.' },
      { title: 'Story-aware handling', body: 'Stories can require fresh access or may expire, so failed story links are not always site errors.' },
    ],
    bestFor: ['Reel references', 'Public image saves', 'Creator portfolio backups', 'Brand inspiration boards'],
    tips: [
      'Confirm the post is visible publicly before processing.',
      'Keep the original caption or source URL with important saved files.',
      'Use downloads for content you own, have permission to save, or can lawfully keep.',
      'Retry later if a public reel fails during source-side rate limiting.',
    ],
  },
  facebook: {
    intro:
      'Use this Facebook downloader for supported public videos, reels, posts, and media links. Facebook URLs can point to many different surfaces, so public visibility is the most important first check.',
    highlights: [
      { title: 'Public videos and reels', body: 'Process supported public Facebook video or reel links when the source is available without private access.' },
      { title: 'Page and post media', body: 'Useful for saving public page assets, announcements, educational clips, and personal references.' },
      { title: 'Story limitations explained', body: 'Stories often depend on account permissions or expiry, so they may require fresh access or may not resolve.' },
    ],
    bestFor: ['Public page videos', 'Event clips', 'Business page backups', 'Educational posts'],
    tips: [
      'Test the link in a private browser window; if it is not visible there, it is not a simple public link.',
      'Use original Facebook links instead of copied redirect chains when possible.',
      'Keep page name, date, and purpose in your filename or notes.',
      'Do not use public visibility as permission to repost someone else\'s media.',
    ],
  },
  pinterest: {
    intro:
      'Use this Pinterest downloader for supported public pins, images, and media links. Pinterest is a discovery platform, so the strongest workflow keeps the saved media close to the project or idea it supports.',
    highlights: [
      { title: 'Pin and image saving', body: 'Process supported public Pinterest links and keep the returned image or media with source notes.' },
      { title: 'Visual research boards', body: 'Build cleaner collections for design, product research, teaching, planning, and inspiration.' },
      { title: 'Source-aware organization', body: 'Pins can point to external sites, so keep the pin URL and destination context when it matters.' },
    ],
    bestFor: ['Mood boards', 'Design references', 'Product research', 'Lesson planning'],
    tips: [
      'Save files into project folders instead of one large downloads folder.',
      'Keep the original pin link beside important visual references.',
      'Remember that a pinned image may belong to an original creator or store.',
      'Use saved media as reference unless you have permission for reuse.',
    ],
  },
  reddit: {
    intro:
      'Use this Reddit downloader for supported public posts, hosted videos, images, and galleries. Reddit media often depends on subreddit context, so save the source post link with the file.',
    highlights: [
      { title: 'Hosted video and image posts', body: 'Process supported Reddit or redd.it links for public media that is still available.' },
      { title: 'Gallery-aware saving', body: 'Some posts include multiple images, external links, or embeds, so available results can vary by post type.' },
      { title: 'Conversation context', body: 'The subreddit, title, and comments may explain why a file mattered in the first place.' },
    ],
    bestFor: ['Research examples', 'Public galleries', 'Troubleshooting references', 'Personal collections'],
    tips: [
      'Keep the subreddit and post title in your notes.',
      'Do not force deleted, private, or removed posts.',
      'External embeds may fail differently from Reddit-hosted media.',
      'Respect posters and communities when saving public media.',
    ],
  },
  twitter: {
    intro:
      'Use this X downloader for supported public posts with video, image, or audio media. X moves in real time, so timing, thread context, and the original post link are important.',
    highlights: [
      { title: 'Public post media', body: 'Paste supported x.com or twitter.com status links and review the media formats returned by the backend.' },
      { title: 'Thread and event context', body: 'Save the source URL and a short note when a post matters because of a live event or conversation.' },
      { title: 'Fast reference workflow', body: 'Useful for saving public media for review, research, or personal offline access when allowed.' },
    ],
    bestFor: ['Public video clips', 'Image references', 'Thread research', 'Event documentation'],
    tips: [
      'Use the direct post URL, not only a profile or search URL.',
      'Record the date or thread context for important saves.',
      'Recheck source posts before relying on rapidly changing information.',
      'Public posts can still contain copyrighted or sensitive material.',
    ],
  },
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
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);
  const [activeAd, setActiveAd] = useState(null);
  const platformIconNode = React.isValidElement(platformIcon)
    ? React.cloneElement(platformIcon, { className: platformIcon.props.className || 'h-12 w-12' })
    : getPlatformIcon(platform === 'whatsappbusiness' ? 'whatsapp' : platform, 88, 'drop-shadow-2xl');

  const handleFetch = async () => {
    const validation = validateUrl(url, platform, t);
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
      if (!response.success) throw new Error(response.error || t('errors.processFailed'));
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
      setError(err.message || t('errors.fetchFailed'));
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
        alert(t('alerts.mobileDownloadStarted', { filename }));
      } else {
        alert(t('alerts.downloadStarted', { filename }));
      }

      // Hide loading indicator
      setIsLoading(false);
      setIsDownloading(false);

    } catch (error) {
      console.error('Download failed:', error);
      setIsLoading(false);
      setIsDownloading(false);

      // Show error message instead of opening in new tab
      alert(t('errors.downloadFailed', { message: error.message || 'Unknown error' }));
      // Don't open in new tab - let user retry the download
    }
  };

  const handleAdComplete = async () => {
    if (!pendingDownload) return;
    const { downloadUrl, type } = pendingDownload;
    setActiveAd(null);
    setPendingDownload(null);
    await startDownload(downloadUrl, type);
  };

  const handleAdCancel = () => {
    setActiveAd(null);
    setPendingDownload(null);
  };

  const requestDownload = (downloadUrl, type, label) => {
    if (!downloadUrl) {
      setError(t('errors.processFailed'));
      return;
    }

    const shortAdDuration = 5 + Math.floor(Math.random() * 6);
    setPendingDownload({ downloadUrl, type, label, shortAdDuration });

    if (type === 'videoHD') {
      setActiveAd('rewarded');
      return;
    }
    if (type === 'videoSD') {
      setActiveAd('skippable');
      return;
    }
    if (type === 'audio') {
      setActiveAd('short');
      return;
    }

    startDownload(downloadUrl, type);
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
    alert(t('downloader.saved'));
  };

  const hasVideoHD = !!result?.downloads?.videoHD;
  const hasVideoSD = !!result?.downloads?.videoSD;
  const hasAudio = !!result?.downloads?.audio;
  const hasVideoOrAudio = hasVideoHD || hasVideoSD || hasAudio;
  const pageContent = platformPageContent[platform] || {
    intro:
      `${platformName} links can return different media options depending on privacy, source availability, and platform changes. Use public links, keep creator context, and save only media you are allowed to keep.`,
    highlights: [
      { title: 'Public link workflow', body: 'Paste a supported public link and review the returned media options before saving.' },
      { title: 'Format awareness', body: 'Available video, image, or audio formats depend on the source link.' },
      { title: 'Responsible saving', body: 'Use the tool for personal, lawful, permitted media workflows.' },
    ],
    bestFor: ['Public links', 'Personal reference', 'Creator backups', 'Project notes'],
    tips: ['Confirm the source is public.', 'Keep the original URL.', 'Respect creator rights.', 'Retry later if the source platform is temporarily blocking requests.'],
  };

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
      {/* Download Progress Indicator */}
      {isDownloading && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">{t('downloader.downloading')}</span>
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
            {platformIconNode || <Download className="h-12 w-12 text-white" strokeWidth={1.8} />}
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t('downloader.title', { platformName })}
          </h1>
          <p className="text-gray-400 text-lg mb-3">{t('downloader.subtitle')}</p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {supportedTypes.map((t, i) => (
              <span key={i} className="px-4 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm">{t}</span>
            ))}
          </div>
        </motion.div>

        {/* Platform Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-8 rounded-3xl border border-purple-500/15 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 md:p-8"
        >
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-purple-300 mb-3">{platformName} workflow</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Save supported public {platformName} media with context, clarity, and control.
              </h2>
              <p className="text-gray-400 leading-7">{pageContent.intro}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {pageContent.bestFor.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-sm font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Supported Workflow Details */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-6 grid md:grid-cols-3 gap-4"
        >
          {pageContent.highlights.map((item, index) => (
            <div key={item.title} className="rounded-2xl border border-purple-500/10 bg-gray-900/60 p-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center font-bold mb-4">
                {index + 1}
              </div>
              <h3 className="text-white font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-6">{item.body}</p>
            </div>
          ))}
        </motion.section>

        {/* How It Works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">{t('downloader.howItWorks')}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <LinkIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">{t('downloader.stepPaste')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.stepPasteDesc', { platformName })}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Download className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">{t('downloader.stepProcess')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.stepProcessDesc')}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Film className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">{t('downloader.stepDownload')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.stepDownloadDesc')}</p>
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
            <span>{t('downloader.trustLine')}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 h-5 w-5" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder={placeholderUrl === 'Paste your link here...' ? t('downloader.placeholder') : placeholderUrl}
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
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('downloader.processing')}</> : <><Download className="mr-2 h-5 w-5" />{t('downloader.process')}</>}
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
                  <span>{t('downloader.processingContent', { platformName })}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('downloader.complete', { progress: Math.round(progress) })}</p>
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
                  <span className="font-medium">{t('downloader.contentFound')}</span>
                </div>

                {/* Preview Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(true)}
                  className="mb-4 flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {t('downloader.preview')}
                </motion.button>

                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {result.thumbnail && (
                    <div className="w-full md:w-40 h-28 md:h-28 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                      <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">{result.title || t('downloader.content', { platformName })}</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                      <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {t('downloader.ready')}</span>
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
                            <p className="font-bold text-white">{t('downloader.hdDownload')}</p>
                            <p className="text-xs text-gray-400">{t('downloader.bestQuality')}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full">{t('downloader.highestQuality')}</span>
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
                            <p className="font-semibold text-white">{t('downloader.sdDownload')}</p>
                            <p className="text-xs text-gray-400">{t('downloader.standardQuality')}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">{t('downloader.balancedSize')}</span>
                        </div>
                      </motion.button>

                      {/* Audio — very short 3s ad */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(result.downloads?.audio, 'audio', 'Audio / MP3')}
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-700/60 hover:border-green-500/40 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-900/60 flex items-center justify-center flex-shrink-0">
                            <Volume2 className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">{t('downloader.audioDownload')}</p>
                            <p className="text-xs text-gray-400">{t('downloader.audioOnlyDesc')}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">{t('downloader.audioOnly')}</span>
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
                          <p className="font-bold text-white">{t('downloader.photoDownload')}</p>
                          <p className="text-xs text-gray-400">{t('downloader.fullResolutionImage')}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">{t('downloader.fullResolution')}</span>
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
                        <p className="font-semibold text-white">{t('downloader.saveCollection')}</p>
                        <p className="text-xs text-gray-400">{t('downloader.saveCollectionDesc')}</p>
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

        {/* Platform Guide */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-10 grid lg:grid-cols-2 gap-6"
        >
          <div className="rounded-3xl border border-purple-500/15 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Best way to use this {platformName} downloader</h2>
            <div className="space-y-4">
              {pageContent.tips.map((tip, index) => (
                <div key={tip} className="flex gap-3">
                  <div className="mt-1 w-7 h-7 rounded-full bg-purple-500/20 text-purple-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-400 leading-7">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-green-500/15 bg-gradient-to-br from-green-950/30 to-gray-950 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">What to check if a link fails</h2>
            <div className="space-y-4 text-gray-400 leading-7">
              <p>
                First, reopen the original {platformName} link and confirm the media is still public. Private, removed, expired, or account-restricted content can fail even when the URL looks correct.
              </p>
              <p>
                Second, try the clean original URL instead of a copied redirect link. Some shared links hide the final media page behind tracking or short-link redirects.
              </p>
              <p>
                Finally, wait and retry if the source platform is rate limiting or changing how it serves media. Public-link downloaders depend on what the upstream platform exposes at that moment.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Feature pills */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { icon: <Zap className="h-6 w-6 text-yellow-400" />, bg: 'bg-yellow-500/10', title: t('downloader.fastDownloads'), desc: t('downloader.fastDownloadsDesc') },
            { icon: <Target className="h-6 w-6 text-purple-400" />, bg: 'bg-purple-500/10', title: t('downloader.formatOptions'), desc: t('downloader.formatOptionsDesc') },
            { icon: <Lock className="h-6 w-6 text-green-400" />, bg: 'bg-green-500/10', title: t('downloader.responsibleUse'), desc: t('downloader.responsibleUseDesc') },
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
          <h2 className="text-2xl font-bold text-white mb-6">{t('downloader.faq')}</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">{t('downloader.freeQuestion')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.freeAnswer')}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">{t('downloader.formatsQuestion')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.formatsAnswer')}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">{t('downloader.safeQuestion')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.safeAnswer')}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10">
              <h3 className="font-semibold text-white mb-2">{t('downloader.copyrightQuestion')}</h3>
              <p className="text-gray-500 text-sm">{t('downloader.copyrightAnswer')}</p>
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

      {/* Download Ad Modals */}
      <RewardedAdModal
        isOpen={activeAd === 'rewarded'}
        onComplete={handleAdComplete}
        onCancel={handleAdCancel}
        downloadLabel={pendingDownload?.label || 'HD Download'}
      />
      <SkippableAdModal
        isOpen={activeAd === 'skippable'}
        onComplete={handleAdComplete}
        onCancel={handleAdCancel}
        downloadLabel={pendingDownload?.label || 'SD Download'}
        duration={pendingDownload?.shortAdDuration || 7}
      />
      <ShortAdModal
        isOpen={activeAd === 'short'}
        onComplete={handleAdComplete}
        onCancel={handleAdCancel}
        downloadLabel={pendingDownload?.label || 'Audio / MP3'}
        duration={pendingDownload?.shortAdDuration || 7}
      />

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
                <h3 className="text-white text-xl font-bold truncate">{result.title || t('downloader.content', { platformName })}</h3>
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
                <p>{t('downloader.platform')}: {platformName}</p>
                <p>{t('downloader.type')}: {result.type || 'video'}</p>
                {result.duration && <p>{t('downloader.duration')}: {result.duration}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
