import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  BookOpenText,
  CheckCircle2,
  Download,
  LayoutDashboard,
  Megaphone,
  MonitorSmartphone,
  Radio,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import AdBanner from '@/components/AdBanner';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'downloaddash:notifications';

const defaultPreferences = {
  webPush: true,
  mobilePush: true,
  updates: true,
  blogPosts: true,
  downloadTips: false,
  security: true,
};

const channels = [
  {
    key: 'webPush',
    title: 'Web app popup notifications',
    text: 'Show browser notifications on this device when DownloadDash publishes important updates.',
    icon: MonitorSmartphone,
  },
  {
    key: 'mobilePush',
    title: 'Mobile app notifications',
    text: 'Prepare the same update and blog alerts for the installed mobile app experience.',
    icon: Smartphone,
  },
  {
    key: 'updates',
    title: 'New product updates',
    text: 'Notify users when features, fixes, supported platforms, or app changes are published.',
    icon: Megaphone,
  },
  {
    key: 'blogPosts',
    title: 'New blog posts',
    text: 'Send a gentle alert when a new guide, tutorial, or safety article goes live.',
    icon: BookOpenText,
  },
  {
    key: 'downloadTips',
    title: 'Download workflow tips',
    text: 'Occasional tips about formats, captions, backups, and better media organization.',
    icon: Sparkles,
  },
  {
    key: 'security',
    title: 'Security and account notices',
    text: 'Important notices about sign-in, privacy, takedown requests, and account safety.',
    icon: ShieldCheck,
  },
];

const examples = [
  {
    title: 'New DownloadDash update',
    body: 'Settings and notifications are now available in the web app.',
    type: 'Product update',
  },
  {
    title: 'New blog guide',
    body: 'Read the latest guide on saving public media responsibly.',
    type: 'Blog post',
  },
  {
    title: 'Mobile app notice',
    body: 'Your installed app can receive the same important update alerts.',
    type: 'Mobile app',
  },
];

export default function Notifications() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [permission, setPermission] = useState('default');
  const [preview, setPreview] = useState(examples[0]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
    } catch {
      setPreferences(defaultPreferences);
    }

    if ('Notification' in window) {
      setPermission(window.Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);

  const enabledCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences]
  );

  const savePreferences = (nextPreferences = preferences) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    setToast({ title: 'Notification settings saved', body: 'Your alert choices are stored on this device.' });
  };

  const togglePreference = (key) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);
    savePreferences(nextPreferences);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      setToast({ title: 'Browser notifications unavailable', body: 'This browser does not expose web notification permission.' });
      return;
    }

    const result = await window.Notification.requestPermission();
    setPermission(result);
    setToast({
      title: result === 'granted' ? 'Web notifications enabled' : 'Permission not enabled',
      body: result === 'granted'
        ? 'DownloadDash can show popup alerts on this device.'
        : 'You can still use the in-app notification center.',
    });
  };

  const sendTestNotification = () => {
    const message = {
      title: preview.title,
      body: preview.body,
    };

    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(message.title, {
        body: message.body,
        icon: '/icon-512.png',
        badge: '/favicon.png',
      });
    }

    setToast(message);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <section className="relative overflow-hidden border-b border-purple-400/25 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.32),transparent_34%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(126,34,206,0.2),transparent_32%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-purple-200">Glowing Alert Center</p>
              <h1 className="mt-3 text-4xl md:text-6xl font-bold text-white">Notifications</h1>
              <p className="mt-5 max-w-3xl text-lg text-gray-200">
                Control popup notifications for the DownloadDash web app and mobile app, including new updates, blog
                posts, security notices, and media-saving tips.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button className="bg-white text-black hover:bg-purple-100 shadow-[0_0_30px_rgba(168,85,247,0.45)]" onClick={requestPermission}>
                  <BellRing className="mr-2 h-4 w-4" />
                  Enable Popup Alerts
                </Button>
                <Button variant="outline" className="border-purple-300/40 text-white hover:bg-purple-500/15" onClick={sendTestNotification}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link to={createPageUrl('Settings')}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-300/30 bg-white/[0.04] p-5 shadow-[0_0_60px_rgba(168,85,247,0.35)] backdrop-blur">
              <div className="rounded-xl border border-purple-300/25 bg-black p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-[0_0_28px_rgba(168,85,247,0.75)]">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-purple-200">{preview.type}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{preview.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{preview.body}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <Summary label="Enabled" value={enabledCount} />
                  <Summary label="Web" value={permission} />
                  <Summary label="Theme" value="Purple" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <section className="grid lg:grid-cols-[0.72fr_1.28fr] gap-6 mb-10">
          <div className="rounded-xl border border-purple-300/25 bg-zinc-950 p-6 shadow-[0_0_38px_rgba(126,34,206,0.18)] h-fit">
            <Radio className="h-8 w-8 text-purple-200" />
            <h2 className="mt-4 text-2xl font-bold">Notification Preview</h2>
            <p className="mt-3 text-gray-400">
              Choose a sample alert, then send a test. When browser permission is granted, the web app can show a real
              device popup. Without permission, the same message appears inside the app.
            </p>
            <div className="mt-5 space-y-3">
              {examples.map((example) => (
                <button
                  key={example.title}
                  type="button"
                  onClick={() => setPreview(example)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    preview.title === example.title
                      ? 'border-purple-200 bg-purple-500/15 shadow-[0_0_22px_rgba(168,85,247,0.25)]'
                      : 'border-white/10 bg-black hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-purple-200">{example.type}</span>
                  <span className="mt-2 block font-semibold text-white">{example.title}</span>
                  <span className="mt-1 block text-sm text-gray-400">{example.body}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-purple-300/25 bg-zinc-950 p-6">
            <h2 className="text-2xl font-bold">Popup Notification Controls</h2>
            <p className="mt-2 text-gray-400">
              Select which alerts should be allowed for the web app and mobile app experience.
            </p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {channels.map((channel) => (
                <ToggleCard
                  key={channel.key}
                  channel={channel}
                  enabled={preferences[channel.key]}
                  onToggle={() => togglePreference(channel.key)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-purple-300/25 bg-zinc-950 p-6">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-6">
            <div>
              <Download className="h-8 w-8 text-purple-200" />
              <h2 className="mt-4 text-2xl font-bold">How It Works</h2>
              <p className="mt-3 text-gray-400">
                DownloadDash can use this page as the user-facing preference center for update and blog alerts. A backend
                push service can later read the same preference names when sending live notifications.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                'Web app users grant browser notification permission from this page.',
                'Mobile app users keep matching update and blog alert preferences.',
                'Every popup uses a black background, white text, and purple glow styling in the app preview.',
              ].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-black p-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-sm leading-6 text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[80] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-purple-200/40 bg-black p-4 text-white shadow-[0_0_45px_rgba(168,85,247,0.65)]">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.75)]">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{toast.title}</h3>
              <p className="mt-1 text-sm text-gray-300">{toast.body}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={() => setToast(null)}
              aria-label="Close notification preview"
              title="Close notification preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-lg border border-purple-300/20 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold capitalize text-white">{String(value)}</div>
    </div>
  );
}

function ToggleCard({ channel, enabled, onToggle }) {
  const Icon = channel.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-xl border p-5 text-left transition-colors ${
        enabled
          ? 'border-purple-200/60 bg-purple-500/15 shadow-[0_0_26px_rgba(168,85,247,0.24)]'
          : 'border-white/10 bg-black hover:bg-white/5'
      }`}
      aria-pressed={enabled}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon className="h-5 w-5 text-purple-200" />
        </span>
        <span className={`relative mt-1 h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-purple-400' : 'bg-zinc-700'}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </span>
      </span>
      <span className="mt-4 block font-semibold text-white">{channel.title}</span>
      <span className="mt-2 block text-sm leading-6 text-gray-400">{channel.text}</span>
    </button>
  );
}
