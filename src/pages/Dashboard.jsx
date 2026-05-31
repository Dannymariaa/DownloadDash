import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Archive,
  Bookmark,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  Filter,
  Folder,
  HardDrive,
  Hash,
  History,
  Image,
  Layers3,
  MessageCircle,
  Music,
  Pin,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User as UserIcon,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';

const platformIcons = {
  tiktok: Music,
  instagram: Camera,
  facebook: UserIcon,
  twitter: Hash,
  whatsapp: MessageCircle,
  telegram: Send,
  snapchat: Camera,
  youtube: Video,
  pinterest: Pin,
  reddit: FileText,
};

const sampleHistory = [
  {
    id: 'sample-1',
    platform: 'youtube',
    title: 'Studio reference clip for launch edit',
    content_type: 'video',
    created_date: '2026-05-28T12:00:00Z',
  },
  {
    id: 'sample-2',
    platform: 'instagram',
    title: 'Campaign moodboard image set',
    content_type: 'image',
    created_date: '2026-05-26T10:30:00Z',
  },
  {
    id: 'sample-3',
    platform: 'tiktok',
    title: 'Creator audio idea with caption notes',
    content_type: 'audio',
    created_date: '2026-05-21T15:10:00Z',
  },
];

const dashboardSections = [
  {
    title: 'About Your Dashboard',
    body: [
      'Your Dashboard is the working desk for saved downloads, reference files, and media you want to return to later. It brings recent activity, saved content, format details, and practical organizing notes into one place, so your video clips, images, and audio files do not become a long pile of anonymous links.',
      'Downloads are shown with the newest items first. Each row includes the platform, title, content type, and date, with a thumbnail when one is available. Search and platform filters help you find an item quickly without scrolling through every past save. Some source links may stop working if the original post is deleted, made private, or restricted by the platform.',
      'Saved items are different from download history. A saved item is something you intentionally keep for future use, review, editing, or archiving. Add notes when a file has context worth remembering: the creator, the source, the project, permission status, or the reason it mattered.',
    ],
  },
  {
    title: 'Organizing Your Media',
    body: [
      'Clear file names make a collection easier to trust. A name such as creator_sunset_clip_2025-07-12.mp4 is easier to locate than a random timestamp. Consistent names also reduce duplicates when the same media is downloaded from more than one device.',
      'Notes are small, but they age well. Write down whether a file is a draft, a reference, an approved asset, or something waiting for credit. If you received permission from a creator, keep the short record close to the file instead of relying on memory.',
    ],
  },
  {
    title: 'Privacy and Responsible Use',
    body: [
      'Only save content that you own, have permission to use, or may lawfully keep under the source license. DownloadDash is built for public, permitted media workflows. It is not designed to bypass restrictions, reach private posts, or ignore platform rules.',
      'If a rights holder asks for removal, delete the content from your Dashboard and review the Help Center guidance for copyright and content removal. When in doubt, ask the creator or platform before publishing, reposting, or distributing a saved file.',
    ],
  },
  {
    title: 'Using Multiple Devices',
    body: [
      'Phones are useful for quick saving and sharing. Tablets help with review. Desktop screens are best for sorting larger collections, renaming files, and comparing formats. When you move files between devices, use secure cloud folders, trusted USB storage, or protected local networks.',
      'Keep one master copy for each important asset. Smaller versions are helpful for messages and quick previews, but the master copy should stay clean, clearly named, and backed up.',
    ],
  },
  {
    title: 'When a Download Fails',
    body: [
      'Downloads may fail when the original media has been removed, made private, region restricted, or changed by the source platform. Temporary source errors often resolve after a short wait. Permanent failures usually mean the source is no longer reachable.',
      'Check the troubleshooting guide when failures repeat. Include the platform, approximate time, and exact error message when contacting support, because those details make it much easier to tell the difference between a broken link and a temporary service issue.',
    ],
  },
  {
    title: 'Team Collaboration',
    body: [
      'Teams should separate approved files from drafts and experiments. Labels such as Approved, Needs Edit, Pending Credit, and Archive Ready keep people from using the wrong version. A shared folder can hold final assets, while individual Dashboards stay focused on personal activity.',
      'Before sending media to a teammate, add enough context for them to use it responsibly: project name, source, intended use, and any creator credit that must stay attached.',
    ],
  },
  {
    title: 'Formats, Metadata, and Search',
    body: [
      'Choose formats based on the job. High-quality video and audio are better for editing and archiving. Smaller compressed files are better for quick sharing. For visual work, thumbnails and titles make fast scanning easier than opening each file one by one.',
      'Tags, dates, locations, and notes make search stronger. For video projects, a note like key quote at 0:15 can save real time during editing. For audio, note whether the file is music, speech, ambient sound, or a reference track.',
    ],
  },
  {
    title: 'Captions, Backups, and Cleanup',
    body: [
      'Captions and transcripts improve accessibility and make media easier to search later. If a video contains speech, save caption files or transcript notes alongside the media whenever possible.',
      'Important files should have backups. Keep at least two copies and store one outside the device you use every day. Remove duplicates, test files, and content you no longer need. A clean Dashboard is faster, calmer, and much easier to manage.',
    ],
  },
];

const workflowCards = [
  { icon: Download, title: 'Capture', text: 'Save videos, images, and audio from supported public sources.' },
  { icon: ClipboardList, title: 'Describe', text: 'Add notes, source details, project names, and permission reminders.' },
  { icon: Layers3, title: 'Sort', text: 'Filter by platform or type so your library stays usable as it grows.' },
  { icon: HardDrive, title: 'Back Up', text: 'Move important masters to storage you control for long-term keeping.' },
];

const PlatformIcon = ({ platform, className = 'h-5 w-5' }) => {
  const Icon = platformIcons[platform] || Folder;
  return <Icon className={className} />;
};

const ContentTypeIcon = ({ type }) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('audio') || normalized.includes('music')) return <FileAudio className="h-4 w-4" />;
  if (normalized.includes('image') || normalized.includes('photo')) return <Image className="h-4 w-4" />;
  return <Video className="h-4 w-4" />;
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [savedContent, setSavedContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [isGuestView, setIsGuestView] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (!isAuth) {
          setIsGuestView(true);
          setDownloadHistory(sampleHistory);
          return;
        }

        const userData = await downloadDash.auth.me();
        setUser(userData);

        const [historyData, savedData] = await Promise.all([
          downloadDash.entities.DownloadHistory.filter({ user_email: userData.email }, '-created_date', 50),
          downloadDash.entities.SavedContent.filter({ user_email: userData.email }, '-created_date', 50),
        ]);
        setDownloadHistory(historyData || []);
        setSavedContent(savedData || []);
      } catch (err) {
        console.log('Error loading dashboard data:', err);
        setIsGuestView(true);
        setDownloadHistory(sampleHistory);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDeleteHistory = async (id) => {
    if (String(id).startsWith('sample-')) return;
    try {
      await downloadDash.entities.DownloadHistory.delete(id);
      setDownloadHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {
      console.log('Error deleting history item');
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await downloadDash.entities.SavedContent.delete(id);
      setSavedContent((prev) => prev.filter((item) => item.id !== id));
    } catch {
      console.log('Error deleting saved item');
    }
  };

  const filteredHistory = useMemo(() => {
    return downloadHistory.filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(query) ||
        item.platform?.toLowerCase().includes(query) ||
        item.content_type?.toLowerCase().includes(query);
      const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
      return matchesSearch && matchesPlatform;
    });
  }, [downloadHistory, filterPlatform, searchTerm]);

  const filteredSaved = useMemo(() => {
    return savedContent.filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(query) ||
        item.platform?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query);
      const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
      return matchesSearch && matchesPlatform;
    });
  }, [savedContent, filterPlatform, searchTerm]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [
      { icon: Download, label: 'Downloads', value: downloadHistory.length, tone: 'text-cyan-300' },
      { icon: Bookmark, label: 'Saved Items', value: savedContent.length, tone: 'text-emerald-300' },
      {
        icon: CalendarDays,
        label: 'This Week',
        value: downloadHistory.filter((item) => new Date(item.created_date).getTime() > weekAgo).length,
        tone: 'text-amber-300',
      },
      {
        icon: Archive,
        label: 'Media Types',
        value: new Set(downloadHistory.map((item) => item.content_type).filter(Boolean)).size || 3,
        tone: 'text-pink-300',
      },
    ];
  }, [downloadHistory, savedContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-300 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.12),transparent_30%)]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Media Library Command Center</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold text-white">
                {user ? `Welcome back, ${user.full_name || 'creator'}.` : 'Your DownloadDash Dashboard'}
              </h1>
              <p className="mt-4 max-w-3xl text-gray-300 text-lg">
                Manage saved videos, images, audio, notes, source details, and download history from one organized
                workspace built for real media projects.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {isGuestView ? (
                  <Button
                    className="bg-cyan-500 text-black hover:bg-cyan-400"
                    onClick={() => downloadDash.auth.redirectToLogin()}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Sign in to use your dashboard
                  </Button>
                ) : (
                  <Button className="bg-cyan-500 text-black hover:bg-cyan-400" asChild>
                    <Link to={createPageUrl('Home')}>
                      <Download className="mr-2 h-4 w-4" />
                      Save more media
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link to={createPageUrl('Account')}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Account controls
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="rounded-lg border border-white/10 bg-black/40 p-4"
                    >
                      <Icon className={`h-5 w-5 ${stat.tone}`} />
                      <div className="mt-3 text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {workflowCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-white/10 bg-zinc-950 p-5">
              <Icon className="h-6 w-6 text-emerald-300" />
              <h2 className="mt-4 font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-gray-400">{text}</p>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-white/10 bg-zinc-950 p-4 md:p-6 mb-10">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Library Activity</h2>
              <p className="text-gray-400 mt-1">Search your saved media, recent downloads, and project notes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[520px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, platform, type, or note"
                  className="pl-10 bg-black border-white/15 text-white"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="w-full sm:w-48 bg-black border border-white/15 rounded-md pl-10 pr-4 py-2 text-white h-10"
                >
                  <option value="all">All Platforms</option>
                  {Object.keys(platformIcons).map((platform) => (
                    <option key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="bg-black border border-white/10">
              <TabsTrigger value="history" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                <History className="mr-2 h-4 w-4" />
                Download History
              </TabsTrigger>
              <TabsTrigger value="saved" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-200">
                <Bookmark className="mr-2 h-4 w-4" />
                Saved Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredHistory.length === 0 ? (
                    <EmptyState
                      icon={History}
                      title="No matching downloads"
                      text="Try a different search, clear the platform filter, or save a new public media link."
                    />
                  ) : (
                    filteredHistory.map((item, idx) => (
                      <MediaRow
                        key={item.id}
                        item={item}
                        idx={idx}
                        onDelete={() => handleDeleteHistory(item.id)}
                        actionIcon={ExternalLink}
                        actionLabel="Open original link"
                        onAction={() => item.original_url && window.open(item.original_url, '_blank')}
                        isSample={String(item.id).startsWith('sample-')}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="saved">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSaved.length === 0 ? (
                    <EmptyState
                      icon={Bookmark}
                      title="No saved content yet"
                      text="Saved items are the files you intentionally keep for future review, editing, or backup."
                    />
                  ) : (
                    filteredSaved.map((item, idx) => (
                      <MediaRow
                        key={item.id}
                        item={item}
                        idx={idx}
                        onDelete={() => handleDeleteSaved(item.id)}
                        actionIcon={Download}
                        actionLabel="Open saved file"
                        onAction={() => item.content_url && window.open(item.content_url, '_blank')}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="grid lg:grid-cols-[0.75fr_1.25fr] gap-6">
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 h-fit">
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-bold">Dashboard Quality Notes</h2>
            <p className="mt-3 text-gray-400">
              A useful media library is more than a download counter. It needs context, cleanup habits, backups,
              accessible captions, and a clear line between personal reference and public reuse.
            </p>
            <div className="mt-5 space-y-3">
              {['Keep creator permission notes close to the file.', 'Save captions or transcripts when speech matters.', 'Delete duplicates before they become confusing.', 'Back up master files outside the browser.'].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {dashboardSections.map((section) => (
                <article key={section.title} className="border-t border-white/10 pt-4">
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  <div className="mt-3 space-y-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 32)} className="text-sm leading-6 text-gray-400">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-black/30">
      <Icon className="h-14 w-14 text-gray-600 mx-auto mb-4" />
      <p className="font-medium text-gray-300">{title}</p>
      <p className="text-gray-500 text-sm mt-2">{text}</p>
    </div>
  );
}

function MediaRow({ item, idx, onDelete, actionIcon: ActionIcon, actionLabel, onAction, isSample = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ delay: idx * 0.03 }}
      className="rounded-lg border border-white/10 bg-black/40 p-4 flex items-center gap-4"
    >
      <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <PlatformIcon platform={item.platform} className="h-7 w-7 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate">{item.title || 'Untitled media'}</h3>
          {isSample && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">Preview</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <PlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
            {item.platform || 'unknown'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ContentTypeIcon type={item.content_type} />
            {item.content_type || 'media'}
          </span>
          {item.created_date && <span>{new Date(item.created_date).toLocaleDateString()}</span>}
        </div>
        {item.notes && <p className="text-gray-500 text-sm mt-1 truncate">{item.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/15"
          aria-label={`${actionLabel}: ${item.title || 'media'}`}
          title={actionLabel}
          onClick={onAction}
          disabled={isSample || !onAction}
        >
          <ActionIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-300 hover:text-red-200 hover:bg-red-500/15"
          aria-label={`Delete ${item.title || 'media'}`}
          title="Delete"
          onClick={onDelete}
          disabled={isSample}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
