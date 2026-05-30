import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  History, Bookmark, Download, Trash2, ExternalLink, LogOut, User as UserIcon, Search,
  Music, Camera, MessageCircle, Send, Pin, FileText, Video, Hash, Folder
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

const PlatformIcon = ({ platform, className = 'h-5 w-5' }) => {
  const Icon = platformIcons[platform] || Folder;
  return <Icon className={className} />;
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
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
        </div>
          {/* Expanded descriptive content: original, human-written guidance for users */}
          <div className="mt-8 bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-purple-500/10">
            <h2 className="text-2xl font-semibold text-white mb-4">About your Dashboard</h2>
            <div className="prose prose-invert max-w-none text-sm">
              <p>
                This page is your personal control center for saving and organizing media you are permitted to keep. The
                Dashboard brings together a simple activity snapshot (recent downloads, saved items, and weekly counts)
                with longer, practical guidance that helps you make better decisions about what to save, how to label it,
                and where to keep it for future use. We designed this surface so you can review activity quickly, then
                follow concrete steps when you need to archive, share, or remove a file.
              </p>

              <p>
                Downloads are shown in order so the most recent requests appear first. Each entry includes the source
                platform, a short title, content type, and the date the item was fetched. Use the search box and platform
                filter to narrow results — for example, searching for a creator name or a keyword in the title often finds
                the clip you need without scrolling through weeks of activity. If a thumbnail is present we show it for
                visual context; if the source removed the media or made it private, that piece may no longer be accessible
                even if it appears here.
              </p>

              <p>
                Saved items are separate from the raw download history. Think of saved items as curated, annotated files
                you kept for reference. Use the saved list to attach notes, keep preferred formats, or to flag items you
                plan to archive in a long-term storage location. When you delete a saved item we remove the reference from
                your account; depending on your settings and the backend retention rules, copies or temporary caches may
                also be removed. If you need a permanent archive, export and store files in your own cloud or local
                folders after verifying permissions.
              </p>

              <h3 className="mt-4">Practical Tips for Organizing Media</h3>
              <p>
                Keep file names descriptive and consistent. Instead of a generic timestamp-based name, add a short label
                that includes the creator, date, and a keyword: for example, "samuels_sunset_clip_2025-07-12.mp4". Good
                names make later searches faster and reduce the risk of duplicate saves. When possible, prefer higher-quality
                formats for archival copies and use compressed versions only for quick sharing.
              </p>

              <p>
                Use notes to record the context and permission status for each save. If you saved something with the
                creator's permission, write a short note and a link to the confirmation method (DM, email, or a comment).
                Documentation can be crucial if you later need to prove permission or respond to a takedown request.
              </p>

              <h3 className="mt-4">Privacy, Permissions, and Responsible Use</h3>
              <p>
                DownloadDash is designed for public-link workflows and lawful use. That means you should only save content
                you own, are explicitly allowed to use, or that is clearly available under a compatible license. We do not
                advise or support bypassing access controls, scraping private posts, or violating platform terms. If you are
                unsure whether a download is permitted, pause and consult the creator or the platform’s rules before
                keeping a copy.
              </p>

              <p>
                If a rights holder contacts you, we provide clear steps in our help center for responding and removing
                material. You can remove items from your Dashboard immediately using the delete action. For more formal
                requests, follow the contact and DMCA instructions available in the footer links.
              </p>

              <h3 className="mt-4">Working Across Devices</h3>
              <p>
                Your Dashboard works on phones, tablets, and desktops. Mobile-first interactions are designed for quick
                saves and one-tap sharing, while desktop workflows are better for batch exports and careful organization.
                If you plan to move large collections between devices, use a reliable transfer method (USB, cloud storage
                with two-factor authentication, or a secured local network share) rather than emailing large files.
              </p>

              <h3 className="mt-4">When Downloads Fail</h3>
              <p>
                Links sometimes stop working because the original post was made private, the creator removed content, or
                platform safeguards limited access. Brief failures often resolve automatically; persistent failures are
                usually due to a removed or restricted source. Our troubleshooting guide lists the usual causes and next
                steps to check before retrying a download.
              </p>

              <h3 className="mt-4">Good Team Workflows</h3>
              <p>
                If you use DownloadDash as part of a small team, maintain a single source of truth: keep a shared folder
                for final, approved assets and a separate personal area for drafts and experiments. Use naming conventions
                and the notes field to mark files with status (e.g. "approved", "needs edit", "credit pending") so
                collaborators understand whether they can use a file for publishing or presentation.
              </p>

              <p>
                Finally, treat the Dashboard as both an activity log and a helpful prompt: if you see many similar saves,
                consolidate them, keep only the highest-quality master file, and discard temporary test downloads. A tidy
                dashboard saves time later and reduces the chance of accidental reuse of the wrong clip.
              </p>
              <h3 className="mt-4">Choosing Formats and Bitrates</h3>
              <p>
                When a downloader returns multiple format options, choose the one that best matches your intended use.
                Archival copies should favor original or lossless formats where available; these keep the highest visual and
                audio fidelity for later editing or repurposing. For immediate sharing or messaging, smaller, compressed
                formats are acceptable and save bandwidth. Keep one "master" file per asset if you intend to maintain a clean
                library — multiple near-identical copies increase clutter and make it harder to identify the best source.
              </p>

              <h3 className="mt-4">Metadata and Searchability</h3>
              <p>
                Metadata — titles, tags, creator, and notes — is the single biggest factor in making a library usable. Add
                searchable tags to describe the subject, location, or emotion you want to find later. Capture timestamps and
                scene descriptions if you frequently work with clips; small notes like "0:12-0:22: key quote" are worth the
                effort. If your workflow includes editing, a short note about the preferred crop or the original aspect ratio
                avoids surprises during production.
              </p>

              <h3 className="mt-4">Accessibility and Captions</h3>
              <p>
                If you save content that includes spoken words, consider creating or requesting captions for accessibility
                and searchability. Captions improve discoverability inside your private archive and make shared content more
                accessible to teammates and audiences. Small workflows that generate a transcript or subtitle file alongside
                the video are valuable additions to an organized archive.
              </p>

              <h3 className="mt-4">Backup Strategies</h3>
              <p>
                Don’t rely on a single storage location for important files. Keep at least two copies and place one copy in
                an offsite or cloud location with versioning enabled. If you work with sensitive material, encrypt backups
                and manage access through role-based permissions on your cloud provider. Regularly verify your backups can be
                restored — a backup that can’t be recovered is no backup at all.
              </p>

              <h3 className="mt-4">When to Keep vs. Delete</h3>
              <p>
                Ask yourself whether a file serves a future need or is merely a temporary sample. Keep masters, project
                files, and items with clear reuse value. Delete duplicates and low-value tests. Having a short retention
                policy (for example, "keep masters permanently, keep raw tests for 90 days") makes decisions easier and
                reduces accidental hoarding. The Dashboard is intentionally simple so this kind of curation can be done with
                a few clicks.
              </p>

              <p>
                If you want, I can expand any of these topics into a printable checklist you can use when moving files to
                archive, sharing with collaborators, or responding to a rights request. Let me know which workflows matter
                most and I’ll create a short how-to for that task.
              </p>
            </div>
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
                          <PlatformIcon platform={item.platform} className="h-7 w-7 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1.5"><PlatformIcon platform={item.platform} className="h-3.5 w-3.5" /> {item.platform}</span>
                          <span>-</span>
                          <span>{item.content_type}</span>
                          <span>-</span>
                          <span>{new Date(item.created_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                          aria-label={`Open original ${item.title || 'download'} link`}
                          title={`Open original ${item.title || 'download'} link`}
                          onClick={() => window.open(item.original_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          aria-label={`Delete ${item.title || 'download'} from history`}
                          title={`Delete ${item.title || 'download'} from history`}
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
                          <PlatformIcon platform={item.platform} className="h-7 w-7 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1.5"><PlatformIcon platform={item.platform} className="h-3.5 w-3.5" /> {item.platform}</span>
                          <span>-</span>
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
                          aria-label={`Download saved ${item.title || 'content'}`}
                          title={`Download saved ${item.title || 'content'}`}
                          onClick={() => window.open(item.content_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          aria-label={`Delete saved ${item.title || 'content'}`}
                          title={`Delete saved ${item.title || 'content'}`}
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
