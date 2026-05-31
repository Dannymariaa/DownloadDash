import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Download,
  Eye,
  FileAudio,
  FileCheck2,
  FolderTree,
  Image,
  KeyRound,
  LayoutDashboard,
  MonitorSmartphone,
  Palette,
  Search,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'downloaddash:settings';

const defaultSettings = {
  defaultMediaType: 'video',
  preferredQuality: 'balanced',
  autoSaveHistory: true,
  showThumbnails: true,
  privacyReminders: true,
  downloadAlerts: true,
  compactRows: false,
  captionsReminder: true,
};

const mediaTypes = [
  { value: 'video', label: 'Video first', icon: Video },
  { value: 'image', label: 'Images first', icon: Image },
  { value: 'audio', label: 'Audio first', icon: FileAudio },
];

const qualityOptions = [
  { value: 'highest', label: 'Highest quality', text: 'Best for editing, archiving, and master copies.' },
  { value: 'balanced', label: 'Balanced', text: 'Good quality without making every file too large.' },
  { value: 'compact', label: 'Compact', text: 'Smaller files for quick sharing and mobile storage.' },
];

const settingGroups = [
  {
    title: 'Library Behavior',
    description: 'Choose how DownloadDash should organize saved media and recent activity.',
    items: [
      {
        key: 'autoSaveHistory',
        label: 'Keep download history',
        text: 'Store recent download records so you can find files again from the Dashboard.',
        icon: LayoutDashboard,
      },
      {
        key: 'showThumbnails',
        label: 'Show media thumbnails',
        text: 'Use available previews for faster scanning across videos, images, and audio saves.',
        icon: Eye,
      },
      {
        key: 'compactRows',
        label: 'Compact dashboard rows',
        text: 'Use tighter spacing when you prefer speed and density over larger previews.',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: 'Safety and Reminders',
    description: 'Keep responsible-use guidance close without turning the product into clutter.',
    items: [
      {
        key: 'privacyReminders',
        label: 'Privacy reminders',
        text: 'Show small reminders before exporting or sharing saved media outside your account.',
        icon: ShieldCheck,
      },
      {
        key: 'captionsReminder',
        label: 'Caption reminders',
        text: 'Remind you to keep captions or transcripts when saved video contains speech.',
        icon: MonitorSmartphone,
      },
      {
        key: 'downloadAlerts',
        label: 'Download alerts',
        text: 'Confirm when downloads start, fail, or need another format choice.',
        icon: Bell,
      },
    ],
  },
];

const notes = [
  'Settings are stored on this device so the page works immediately, even before a full cloud preferences backend is added.',
  'Account-level privacy, sign-in, and identity details belong on the Account page. This page focuses on product behavior and media workflow preferences.',
  'Changing quality preferences does not override the formats provided by source platforms; it only guides which option should be easiest to choose first.',
];

const workflowPresets = [
  {
    title: 'Creator Archive',
    text: 'Best for creators who save source clips, campaign examples, thumbnails, captions, and reference posts before editing or repost planning.',
    points: ['Highest quality first', 'Thumbnails enabled', 'Caption reminders on', 'History kept for review'],
  },
  {
    title: 'Research Library',
    text: 'Best for students, researchers, journalists, and teams that collect public posts for review, citations, and evidence trails.',
    points: ['Balanced quality', 'Privacy reminders on', 'Compact dashboard rows', 'Clear labels before export'],
  },
  {
    title: 'Mobile Saver',
    text: 'Best when you save media from a phone and need smaller files, fast previews, and fewer storage surprises.',
    points: ['Compact quality', 'Download alerts on', 'Images or video first', 'Clean old files weekly'],
  },
];

const managementGuides = [
  {
    title: 'Naming and folders',
    icon: FolderTree,
    body: 'Use simple folder names like Tutorials, Client References, Funny Clips, Product Ideas, and Archive. Rename important files before they become a pile of random platform IDs.',
  },
  {
    title: 'Before you share',
    icon: ShieldCheck,
    body: 'Check whether the file is yours to share, whether credit is needed, and whether the platform or creator allows reuse. Saving for personal use is not the same as republishing.',
  },
  {
    title: 'Find things faster',
    icon: Search,
    body: 'Keep thumbnails on when you work visually. Use compact rows only when you already know the files and want a faster list view with less scrolling.',
  },
  {
    title: 'Clean up old saves',
    icon: Trash2,
    body: 'Delete failed downloads, duplicate clips, unfinished experiments, and files you no longer need. A smaller library is easier to back up and easier to trust.',
  },
];

const deviceChecklist = [
  'Confirm your browser allows downloads from DownloadDash.',
  'Keep enough device storage available before saving large HD or 4K files.',
  'Use a stable connection when saving longer videos or multi-file downloads.',
  'Back up files you cannot replace before clearing browser data or app storage.',
  'Review privacy reminders before moving saved media into public folders.',
  'Keep captions or notes beside educational, interview, or tutorial content.',
];

const settingFaqs = [
  {
    question: 'Do these settings change every platform?',
    answer: 'No. They guide DownloadDash behavior. Source platforms still decide which formats, thumbnails, captions, and quality options are available for a public link.',
  },
  {
    question: 'Why are some preferences stored on this device?',
    answer: 'Device storage keeps the page fast and useful immediately. Account sync can be added later without changing the visible preference model.',
  },
  {
    question: 'Should Dashboard and Account settings be separate?',
    answer: 'Yes. Dashboard is for saved media activity. Account is for identity and personal controls. Settings is for product behavior and workflow preferences.',
  },
  {
    question: 'What should I choose for quality?',
    answer: 'Choose Highest for archives and editing, Balanced for everyday saving, and Compact when storage or mobile sharing matters more than maximum detail.',
  },
];

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [user, setUser] = useState(null);
  const [savedState, setSavedState] = useState('idle');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {
      setSettings(defaultSettings);
    }

    const loadUser = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (isAuth) setUser(await downloadDash.auth.me());
      } catch {
        setUser(null);
      }
    };

    loadUser();
  }, []);

  const changedCount = useMemo(
    () => Object.keys(defaultSettings).filter((key) => settings[key] !== defaultSettings[key]).length,
    [settings]
  );

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedState('idle');
  };

  const saveSettings = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedState('saved');
    window.setTimeout(() => setSavedState('idle'), 1800);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    setSavedState('reset');
    window.setTimeout(() => setSavedState('idle'), 1800);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.17),transparent_34%),radial-gradient(circle_at_78%_12%,rgba(16,185,129,0.14),transparent_30%)]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Product Preferences</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold">Settings</h1>
              <p className="mt-4 max-w-3xl text-lg text-gray-300">
                Tune how DownloadDash handles saved videos, images, audio, previews, reminders, and download behavior
                on this device.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="bg-blue-500 text-black hover:bg-blue-400" onClick={saveSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={resetSettings}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link to={createPageUrl('Account')}>
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/15">
                  <Settings2 className="h-6 w-6 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Preference Summary</h2>
                  <p className="text-sm text-gray-400">{user?.email || 'Device settings for this browser'}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Summary label="Changed" value={changedCount} />
                <Summary label="Media" value={settings.defaultMediaType} />
                <Summary label="Quality" value={settings.preferredQuality} />
                <Summary label="Saved" value={savedState === 'idle' ? 'Ready' : savedState} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <section className="grid lg:grid-cols-[0.7fr_1.3fr] gap-6 mb-10">
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 h-fit">
            <Palette className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-bold">Default Media Focus</h2>
            <p className="mt-3 text-gray-400">
              Choose the media type you usually save first. DownloadDash can use this as a starting preference for future
              filters, quick actions, and dashboard layouts.
            </p>
            <div className="mt-5 space-y-3">
              {mediaTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateSetting('defaultMediaType', value)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    settings.defaultMediaType === value
                      ? 'border-emerald-300/60 bg-emerald-500/10'
                      : 'border-white/10 bg-black/40 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-emerald-300" />
                    <span className="font-medium">{label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-bold">Preferred File Quality</h2>
            <p className="mt-2 text-gray-400">Set the quality choice that should feel most natural in your workflow.</p>
            <div className="mt-5 grid md:grid-cols-3 gap-4">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSetting('preferredQuality', option.value)}
                  className={`rounded-lg border p-5 text-left transition-colors ${
                    settings.preferredQuality === option.value
                      ? 'border-blue-300/60 bg-blue-500/10'
                      : 'border-white/10 bg-black/40 hover:bg-white/5'
                  }`}
                >
                  <Download className="h-5 w-5 text-blue-300" />
                  <h3 className="mt-4 font-semibold">{option.label}</h3>
                  <p className="mt-2 text-sm text-gray-400">{option.text}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          {settingGroups.map((group) => (
            <div key={group.title} className="rounded-xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">{group.title}</h2>
              <p className="mt-2 text-gray-400">{group.description}</p>
              <div className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <ToggleRow
                    key={item.key}
                    item={item}
                    checked={settings[item.key]}
                    onChange={() => updateSetting(item.key, !settings[item.key])}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-xl border border-white/10 bg-zinc-950 p-6">
          <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-6">
            <div>
              <ShieldCheck className="h-8 w-8 text-emerald-300" />
              <h2 className="mt-4 text-2xl font-bold">Settings Notes</h2>
              <p className="mt-3 text-gray-400">
                These preferences are designed for media saving habits, not legal shortcuts. Always keep rights,
                permission, and source-platform rules in mind.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {notes.map((note) => (
                <div key={note} className="rounded-lg border border-white/10 bg-black/40 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <p className="mt-3 text-sm leading-6 text-gray-400">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!user && (
          <section className="mt-10 rounded-xl border border-blue-400/20 bg-blue-500/10 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Want settings across devices?</h2>
                <p className="mt-1 text-gray-300">Sign in to connect preferences with your DownloadDash account when cloud sync is available.</p>
              </div>
              <Button className="bg-blue-500 text-black hover:bg-blue-400" onClick={() => downloadDash.auth.redirectToLogin()}>
                <KeyRound className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Workflow Presets</p>
            <h2 className="mt-3 text-3xl font-bold">Choose Settings That Match How You Save</h2>
            <p className="mt-3 text-gray-400">
              These presets are not extra buttons yet; they explain the best combination of preferences for common
              DownloadDash use cases so users understand what each setting is meant to support.
            </p>
          </div>
          <div className="mt-6 grid lg:grid-cols-3 gap-5">
            {workflowPresets.map((preset) => (
              <article key={preset.title} className="rounded-xl border border-white/10 bg-zinc-950 p-6">
                <FileCheck2 className="h-7 w-7 text-blue-300" />
                <h3 className="mt-4 text-xl font-semibold">{preset.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-400">{preset.text}</p>
                <ul className="mt-5 space-y-3">
                  {preset.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-white/10 bg-zinc-950 p-6">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-8">
            <div>
              <FolderTree className="h-8 w-8 text-emerald-300" />
              <h2 className="mt-4 text-3xl font-bold">Library Management Guide</h2>
              <p className="mt-3 text-gray-400">
                A good settings page should help users make better choices after they leave the page. Use these
                reminders to keep saved media organized, respectful, and easy to recover.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {managementGuides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <div key={guide.title} className="rounded-lg border border-white/10 bg-black/40 p-5">
                    <Icon className="h-5 w-5 text-blue-300" />
                    <h3 className="mt-4 font-semibold">{guide.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{guide.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-10 grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-bold">Device Readiness Checklist</h2>
            <p className="mt-2 text-gray-400">
              Settings work best when the browser, device, and storage setup are ready for large media files.
            </p>
            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {deviceChecklist.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-black/40 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-6">
            <SlidersHorizontal className="h-8 w-8 text-blue-300" />
            <h2 className="mt-4 text-2xl font-bold">Recommended Starting Setup</h2>
            <p className="mt-3 text-gray-300">
              For most users, keep history, thumbnails, privacy reminders, caption reminders, and download alerts on.
              Use Balanced quality until you know you need bigger archive files or smaller mobile files.
            </p>
            <div className="mt-5 rounded-lg border border-blue-300/20 bg-black/30 p-4">
              <p className="text-sm font-semibold text-blue-100">Best default mix</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Video first, Balanced quality, normal row spacing, visible thumbnails, and safety reminders enabled.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold">Settings Questions</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-4">
            {settingFaqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-white/10 bg-black/40 p-5">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-2 truncate text-lg font-semibold capitalize">{value}</div>
    </div>
  );
}

function ToggleRow({ item, checked, onChange }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full rounded-lg border border-white/10 bg-black/40 p-4 text-left transition-colors hover:bg-white/5"
      aria-pressed={checked}
    >
      <span className="flex gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon className="h-5 w-5 text-blue-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-4">
            <span className="font-medium text-white">{item.label}</span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-emerald-400' : 'bg-zinc-700'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </span>
          <span className="mt-2 block text-sm leading-6 text-gray-400">{item.text}</span>
        </span>
      </span>
    </button>
  );
}
