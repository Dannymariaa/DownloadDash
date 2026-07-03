import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Link as LinkIcon, Loader2, CheckCircle,
  AlertCircle, Bookmark, Shield, Film, Volume2, Image, Crown, Zap, Target, Lock, Eye, Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from './AdBanner';
import { useI18n } from '@/lib/i18n';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { createPageUrl } from '@/utils';

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

const downloaderInternalLinks = [
  { platform: 'tiktok', page: 'TikTokDownloader', label: 'TikTok Downloader', keyword: 'TikTok downloader without watermark HD' },
  { platform: 'instagram', page: 'InstagramDownloader', label: 'Instagram Downloader', keyword: 'Instagram downloader without watermark HD' },
  { platform: 'facebook', page: 'FacebookDownloader', label: 'Facebook Downloader', keyword: 'Facebook video downloader HD' },
  { platform: 'youtube', page: 'YouTubeDownloader', label: 'YouTube Downloader', keyword: 'YouTube downloader HD' },
  { platform: 'twitter', page: 'TwitterDownloader', label: 'X Downloader', keyword: 'X video downloader HD' },
  { platform: 'reddit', page: 'RedditDownloader', label: 'Reddit Downloader', keyword: 'Reddit video downloader HD' },
  { platform: 'pinterest', page: 'PinterestDownloader', label: 'Pinterest Downloader', keyword: 'Pinterest image and video downloader' },
];

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
    editorial: [
      {
        heading: 'A calmer way to save YouTube media',
        paragraphs: [
          'YouTube is usually where people go when they need more than a passing clip. A tutorial might explain a repair, a lecture might contain the one section a student needs to revisit, or a creator may want a local backup of a public upload before editing a new version. The best saving workflow respects that slower, more deliberate use. It starts by asking why the file is needed, then keeps the original title, channel, and link close to the saved copy.',
          'That matters because YouTube videos often carry context outside the video file itself. The description, chapter labels, pinned comments, captions, upload date, and channel identity can all change how the saved media should be understood. DownloadDash gives users a place to process a supported public link, but a thoughtful archive keeps enough notes to make the file useful later.',
        ],
      },
      {
        heading: 'Quality choices should match the job',
        paragraphs: [
          'Not every YouTube save needs the largest file. A student reviewing a short explanation may prefer a smaller format that loads quickly on a phone. A creator checking color, motion, or editing rhythm may need the best available quality. Someone saving a spoken lesson may only need audio. Treating every download as the same job wastes storage and makes personal folders harder to manage.',
          'A good habit is to name the purpose before choosing the format. If the purpose is study, audio may be enough. If the purpose is visual review, video quality matters. If the purpose is creator backup, keep the cleanest file available and store it with the original public URL. This kind of practical decision-making makes the page more useful than a plain button.',
        ],
      },
      {
        heading: 'What responsible YouTube saving looks like',
        paragraphs: [
          'Responsible saving is not about fear; it is about clarity. Save videos you created, videos you have permission to keep, or content your local law and platform rules allow you to store for personal use. Do not treat a returned file as permission to repost, sell, re-edit, or remove attribution from someone else\'s work.',
          'When a YouTube link fails, the cause may be ordinary: the video was removed, made private, region-limited, age-limited, or blocked by source-side checks. Reopen the video, confirm visibility, and try the canonical link. If it still fails, the honest answer may simply be that the source is not exposing a usable file at that moment.',
        ],
      },
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
    editorial: [
      {
        heading: 'TikTok saving is really about catching fast ideas',
        paragraphs: [
          'TikTok moves so quickly that useful posts can disappear from memory before a project even starts. A creator may notice a strong opening line, a student may find a short explanation, or a small business may study how a product demo is framed. Saving a supported public TikTok link is most useful when the file is tied to the reason it was saved, not dropped into a random folder with no explanation.',
          'The platform is full of sounds, edits, captions, gestures, image posts, and story-style updates that only make sense in context. If the save is for inspiration, label the idea. If it is your own post, mark it as a backup. If it is for campaign research, keep the topic and date. That extra ten seconds turns a download into a real working reference.',
        ],
      },
      {
        heading: 'Videos, photos, and audio need different treatment',
        paragraphs: [
          'A TikTok video might be valuable because of timing. A photo post might be useful because of sequence. An audio trend might matter because the sound carries recognition before the viewer reads a caption. These are different media jobs, so they should not all be archived the same way. The file format should match the part of the post you actually need.',
          'DownloadDash can show available options from supported public links, but the user still decides what belongs in the archive. If the goal is to study a hook, the video matters. If the goal is to remember a sound, audio may be enough. If the goal is a mood board, a still image might be the cleanest reference.',
        ],
      },
      {
        heading: 'Keep trend research respectful',
        paragraphs: [
          'TikTok trends can make other people\'s work feel public and shared, but individual posts still belong to creators. A clean file is not a license. A watermark-free result does not erase ownership, performance, editing, caption work, or the rights connected to the original media.',
          'Use downloads for your own content, approved material, learning, review, or lawful personal reference. If a link is private, removed, or restricted, treat that as a boundary. The strongest TikTok workflow is selective, labeled, and honest about what the saved file can and cannot be used for.',
        ],
      },
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
    editorial: [
      {
        heading: 'Instagram media loses value when the caption disappears',
        paragraphs: [
          'Instagram is rarely just the image or video. A reel may depend on its caption, a carousel may tell a story through order, and a post may matter because of the creator, product, location, or audio. When users save only the media file and ignore the context, the archive becomes harder to understand later.',
          'A cleaner Instagram workflow keeps the source URL and a short note beside the file. That note can be as simple as "lighting reference", "caption structure", "portfolio backup", or "public tutorial". This makes the saved media useful without pretending it is detached from the creator who published it.',
        ],
      },
      {
        heading: 'Reels, posts, stories, and carousels are not the same',
        paragraphs: [
          'A public reel may resolve differently from a feed image, a carousel, a story, or an older IGTV-style link. Stories are especially sensitive because they can expire or depend on account visibility. That is why a failed story link does not always mean the tool is broken. Sometimes the source simply is not available as a public file anymore.',
          'Before processing a link, open it in the browser and confirm that it is still visible. If the post is public and available, DownloadDash can attempt the supported workflow. If the post depends on private access, a follow relationship, or temporary story permissions, the result may be limited or unavailable.',
        ],
      },
      {
        heading: 'Build an Instagram library around purpose',
        paragraphs: [
          'Creators and teams often save Instagram media for portfolio review, campaign planning, design references, caption ideas, or personal backup. Those are different folders, not one giant download bucket. Purpose-based folders help prevent confusion and make it easier to delete material that no longer has a reason to stay.',
          'The rights boundary stays important. Save what you own, what you have permission to use, or what you can lawfully keep for personal reference. Do not use a saved file to strip credit, repost without permission, or turn someone else\'s work into a new asset without approval.',
        ],
      },
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
    editorial: [
      {
        heading: 'Facebook links need extra patience',
        paragraphs: [
          'Facebook is not one simple media surface. A link may point to a public page video, a reel, a group post, a story, a photo, a reshared item, or an event clip. Two links can look similar while requiring completely different access. That is why Facebook saving works best when users first check whether the media is truly public.',
          'A practical test is to open the link in a private browser window. If the media is not visible there, a public-link downloader may not be able to resolve it. That simple check saves time and reduces the frustration of retrying a private or permission-bound link.',
        ],
      },
      {
        heading: 'Public page media is the cleanest workflow',
        paragraphs: [
          'The most reliable Facebook saves usually come from public pages, public reels, and public video posts. These are useful for keeping business page backups, event clips, community announcements, educational videos, or personal references. Even then, the saved file should be labeled with the page name, date, and reason for saving.',
          'Stories are a different case. A story may expire, require a viewing account, or depend on permissions that are not available to the backend. If a story fails, users should not assume every setting is wrong. The source may simply be temporary or restricted.',
        ],
      },
      {
        heading: 'Use Facebook archives carefully',
        paragraphs: [
          'Facebook often contains family moments, community updates, business content, and personal media. Public visibility does not remove privacy expectations or creator rights. A file that can be seen publicly should still be handled with care, especially if people, children, private events, or sensitive topics appear in it.',
          'DownloadDash is best used for lawful personal saving, page backup, research, or content you have permission to keep. If a post changes visibility or disappears, respect that signal. A responsible archive should help users stay organized, not encourage them to bypass boundaries.',
        ],
      },
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
    editorial: [
      {
        heading: 'Pinterest saves should keep the trail back to the idea',
        paragraphs: [
          'Pinterest is excellent for finding visual direction, but a saved image can lose meaning when it is separated from the pin, board, or destination link. A color palette, room idea, outfit reference, craft tutorial, product shot, or lesson image may need its source context later.',
          'The strongest Pinterest archive keeps the downloaded media, the public pin URL, and a short project note together. That note might say "kitchen cabinet color", "poster layout reference", "classroom craft", or "product comparison". These little labels make the saved material useful weeks after the original browsing session.',
        ],
      },
      {
        heading: 'Organize by project, not by platform',
        paragraphs: [
          'A single Pinterest folder becomes messy quickly. Project folders are cleaner: wedding ideas, brand palette, classroom resources, product research, photography poses, renovation references, or recipe visuals. When files live near the project they support, users spend less time hunting and more time making decisions.',
          'This also helps with rights awareness. A visual reference stored inside a research folder is less likely to be mistaken for original material ready to publish. Pinterest often points to photographers, stores, bloggers, designers, or publishers who may own the original work.',
        ],
      },
      {
        heading: 'Treat inspiration as inspiration',
        paragraphs: [
          'Pinterest can make images feel endlessly shareable, but saving a public image is not the same as owning it. Users should avoid copying, reposting, selling, or rebranding visuals unless they have permission or the right license. A good archive respects the difference between reference and reuse.',
          'DownloadDash can support public pin and media workflows, but the user decides how the file is handled afterward. Keep source notes, credit where appropriate, and use saved files to support planning rather than to erase the original creator.',
        ],
      },
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
    editorial: [
      {
        heading: 'Reddit media is tied to the discussion around it',
        paragraphs: [
          'A Reddit image or video often makes sense because of the subreddit, title, comments, moderation context, or problem being discussed. Saving the media without the post link can remove the most important part of the reference. For support examples, research, education, or personal collections, the thread matters.',
          'A practical Reddit archive keeps the public post URL, subreddit name, post title, and date saved. That gives the file a memory. Later, when the image or video appears in a folder, the user can still understand what community it came from and why it was worth keeping.',
        ],
      },
      {
        heading: 'Hosted media, galleries, and external links behave differently',
        paragraphs: [
          'Reddit posts can contain hosted video, single images, galleries, external embeds, crossposts, or links to other sites. These formats do not resolve the same way. A Reddit-hosted image may be simple while an external video depends on another platform entirely.',
          'When a Reddit link fails, check whether the post was removed, deleted, locked behind age checks, or using an external host. The failure may not be caused by the downloader page. It may come from the original post type or from a media source outside Reddit.',
        ],
      },
      {
        heading: 'Keep community respect in the workflow',
        paragraphs: [
          'Reddit can feel anonymous, but posts still come from real people and communities. A public post should not be saved for harassment, reposted without context, or used to misrepresent the original conversation. Good saving habits protect the user and the community.',
          'DownloadDash is best used for supported public media, lawful personal reference, research notes, and content the user has a legitimate reason to keep. If a post is removed or no longer public, the respectful choice is to stop chasing it.',
        ],
      },
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
    editorial: [
      {
        heading: 'X posts are often valuable because of timing',
        paragraphs: [
          'X moves around live events, reactions, corrections, jokes, statements, and fast public conversation. A video or image may matter because it appeared at a specific moment in a thread. If the saved file is separated from that moment, the meaning can change.',
          'A stronger X archive keeps the post URL, date, topic, and thread note with the media. For research, reporting, education, or personal review, this helps users remember whether a file was a first report, a reaction, a correction, or a later summary.',
        ],
      },
      {
        heading: 'Save the post, not just the file',
        paragraphs: [
          'A public X video might be a product demo, news clip, creator post, sports moment, meme, announcement, or commentary. Each one needs different handling. The file alone cannot explain whether it was official, disputed, edited, quoted, or part of a larger conversation.',
          'DownloadDash can process supported public post links, but the user should keep context manually when it matters. That might mean saving a note with the account name, topic, and any thread the post belongs to. The goal is not only access; it is understanding.',
        ],
      },
      {
        heading: 'Real-time media needs extra care',
        paragraphs: [
          'Information on X can change quickly. A post may be deleted, corrected, challenged, or clarified after it spreads. Before relying on a saved file, users should revisit the source, check the surrounding conversation, and avoid presenting the media without context.',
          'Public visibility does not remove rights or sensitivity. Save media you own, have permission to keep, or can lawfully store for personal reference. Avoid using saved files to remove credit, distort meaning, or publish material outside the boundaries of the original post.',
        ],
      },
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

  const getDownloadExtension = (type, urlValue = '') => {
    const cleanUrl = String(urlValue || '').split('?')[0].toLowerCase();
    const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/);
    if (match) return match[1];
    if (type === 'audio') return 'mp3';
    if (type === 'image' || type === 'album') return 'jpg';
    return 'mp4';
  };

  const buildFilename = (type, urlValue = '', index = null) => {
    const randomDigits = Math.floor(Math.random() * 9000000000) + 1000000000;
    const suffix = index === null ? '' : `-${String(index + 1).padStart(2, '0')}`;
    return `DownloadDash${randomDigits}${suffix}.${getDownloadExtension(type, urlValue)}`;
  };

  const startDownload = async (downloadUrl, type, index = null) => {
    if (!downloadUrl) return;

    try {
      // Show loading indicator
      setIsLoading(true);
      setIsDownloading(true);

      const filename = buildFilename(type, downloadUrl, index);

      // Use the client's downloadToDevice function which handles CORS and proxy fallback
      await downloadDash.downloadToDevice(downloadUrl, filename, result?.original_url || url, type);

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

  const startAlbumDownload = async (items) => {
    if (!items?.length) return;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemType = item.type === 'video' ? 'videoHD' : item.type === 'audio' ? 'audio' : 'image';
      await startDownload(item.url, itemType, index);
    }
  };

  const beginDownloadAfterGate = (downloadUrl, type, label, items = null) => {
    if (!downloadUrl) {
      setError(t('errors.processFailed'));
      return;
    }

    if (items?.length) {
      startAlbumDownload(items);
    } else {
      startDownload(downloadUrl, type);
    }
  };

  const requestDownload = (downloadUrl, type, label, items = null) => {
    beginDownloadAfterGate(downloadUrl, type, label, items);
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
  const albumItems = Array.isArray(result?.downloads?.items)
    ? result.downloads.items.filter((item) => item?.url)
    : [];
  const hasAlbumItems = albumItems.length > 1;
  
  // Separate album items by type
  const photoItems = albumItems.filter((item) => {
    const itemType = (item.type || '').toLowerCase();
    return itemType !== 'audio' && itemType !== 'video';
  });
  const audioItems = albumItems.filter((item) => {
    const itemType = (item.type || '').toLowerCase();
    return itemType === 'audio';
  });
  const videoItems = albumItems.filter((item) => {
    const itemType = (item.type || '').toLowerCase();
    return itemType === 'video';
  });
  
  // Check if album has audio that should be extracted
  const albumHasAudio = audioItems.length > 0 || (hasAlbumItems && albumItems.some(item => item.type === 'audio'));
  const effectiveHasAudio = hasAudio || albumHasAudio;
  
  const hasImage = !!result?.downloads?.image;
  const hasPhotoDownload = (hasAlbumItems && photoItems.length > 0) || hasImage;
  const photoDownloadUrl = hasAlbumItems ? photoItems[0]?.url : result?.downloads?.image;
  const hasVideoOrAudio = hasVideoHD || hasVideoSD || effectiveHasAudio;
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
  const relatedDownloaderLinks = downloaderInternalLinks.filter((item) => item.platform !== platform);

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
                  {hasVideoOrAudio && (
                    <>
                      {/* HD Video */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(result.downloads?.videoHD, 'videoHD', 'HD Video')}
                        className={`${hasVideoHD ? '' : 'hidden '}w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/40 hover:border-purple-500/70 transition-all group`}
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
                        className={`${hasVideoSD ? '' : 'hidden '}w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-700/60 hover:border-purple-500/40 transition-all group`}
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

                      {/* Audio */}
                      <motion.button
                        variants={downloadOptionVariants}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => requestDownload(
                           result.downloads?.audio || audioItems[0]?.url,
                           'audio',
                           audioItems.length > 1 ? `All Audio (${audioItems.length})` : 'Audio / MP3',
                           audioItems.length > 0 ? audioItems : null
                         )}
                        className={`${effectiveHasAudio ? '' : 'hidden '}w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-700/60 hover:border-green-500/40 transition-all group`}
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
                  )}

                  {hasPhotoDownload && (
                    /* Image — skippable after 5s */
                    <motion.button
                      variants={downloadOptionVariants}
                      whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() =>
                        requestDownload(
                          photoDownloadUrl,
                          hasAlbumItems ? 'album' : 'image',
                          hasAlbumItems ? `All Photos (${photoItems.length})` : 'HD Photo',
                          hasAlbumItems ? photoItems : null
                        )
                      }
                      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/40 hover:border-blue-500/70 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                          <Image className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white">
                            {hasAlbumItems ? `Download All Photos (${photoItems.length})` : t('downloader.photoDownload')}
                          </p>
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

        {/* Platform Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mt-10 rounded-3xl border border-purple-500/15 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 md:p-8"
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
          transition={{ delay: 0.32 }}
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

        {/* Deep Platform Writing */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-purple-300 mb-3">{platformName} saving guide</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Extra notes for a cleaner, more useful {platformName} media workflow
            </h2>
            <p className="text-gray-400 leading-7">
              The downloader above is only one part of the experience. A good media workflow also keeps context, purpose, file quality, and creator rights in view, especially when a public link comes from a fast-moving social platform.
            </p>
          </div>
          <div className="mt-8 grid gap-6">
            {pageContent.editorial?.map((section) => (
              <article key={section.heading} className="rounded-2xl border border-purple-500/10 bg-gray-950/70 p-5 md:p-6">
                <h3 className="text-xl font-bold text-white mb-4">{section.heading}</h3>
                <div className="space-y-4 text-gray-400 leading-7">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        {/* Related Downloader Pages */}
        <section className="mt-10 rounded-3xl border border-purple-500/15 bg-gray-950/70 p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-purple-300 mb-3">More DownloadDash tools</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Explore other HD downloader pages
            </h2>
            <p className="text-gray-400 leading-7">
              DownloadDash includes dedicated downloader pages for major public-link platforms. Use the page that matches your source link for the clearest workflow and best context.
            </p>
          </div>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatedDownloaderLinks.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-purple-400/50 hover:bg-purple-500/10"
              >
                <h3 className="font-bold text-white">{item.label}</h3>
                <p className="mt-2 text-sm text-gray-400">{item.keyword}</p>
              </Link>
            ))}
          </div>
        </section>

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
