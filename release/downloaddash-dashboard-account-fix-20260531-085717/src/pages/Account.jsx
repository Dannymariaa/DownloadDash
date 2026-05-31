import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Download,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Vault,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';
import { Button } from '@/components/ui/button';

const preferenceCards = [
  {
    icon: ShieldCheck,
    title: 'Privacy posture',
    text: 'Keep saved media private by default and share only when a project needs review.',
  },
  {
    icon: Bell,
    title: 'Useful alerts',
    text: 'Security, status, and support notices should stay visible while casual updates can be quiet.',
  },
  {
    icon: Vault,
    title: 'Retention habits',
    text: 'Review old saves regularly so your library stays intentional instead of becoming storage clutter.',
  },
  {
    icon: FileCheck2,
    title: 'Permission memory',
    text: 'Use notes to record creator permission, license terms, credits, and project context.',
  },
];

const accountGuide = [
  {
    title: 'What Your Account Is For',
    body: [
      'Your DownloadDash account is the personal layer around your media-saving workflow. The Dashboard shows what you have saved and downloaded; the Account page explains how that activity should be managed, protected, and reviewed over time. Think of it as the control room for identity, privacy, notification choices, data habits, and responsible ownership.',
      'Because DownloadDash works with videos, images, and audio, account settings matter more than they would in a simple bookmarking tool. A saved clip can contain a voice, a face, a brand, a creator credit, or a licensing condition. Your account helps you keep those details attached to the work so future you, or a teammate, does not have to guess where a file came from or whether it is cleared for use.',
    ],
  },
  {
    title: 'Profile and Identity',
    body: [
      'Use a profile name and email address you can recognize quickly. This sounds small, but it helps when you contact support, review export records, or work across more than one device. If DownloadDash adds team workspaces to your plan, your profile also becomes the name collaborators see next to saved media, requests, and project notes.',
      'Avoid sharing a single account across a group. Shared sign-ins make it difficult to understand who saved a file, who deleted something, or who changed a note. A cleaner workflow is to let each person use an individual account and move approved files into a shared folder or project space when they are ready.',
    ],
  },
  {
    title: 'Security Basics',
    body: [
      'Protect the email address connected to your account. If your email is compromised, password resets and important notices can be intercepted. Use a strong, unique password for the identity provider you use to sign in, and enable two-factor authentication whenever it is available. A password manager is strongly recommended because it removes the temptation to reuse old passwords.',
      'If you notice unfamiliar activity, sign out of active sessions, change your password, and contact support with the approximate time and device involved. Include screenshots or error messages only when they do not expose private links. The faster suspicious activity is reported, the easier it is to separate a real security concern from a normal device or browser change.',
    ],
  },
  {
    title: 'Privacy and Saved Media',
    body: [
      'Saved content should be treated as private working material unless you deliberately export or share it. DownloadDash is a utility for organizing public or permitted media; it is not a license to republish someone else\'s work. Before a file leaves your personal workspace, check the source, the creator\'s terms, and any permission notes you stored with it.',
      'Some projects involve sensitive context even when the original media is public. A research clip, client reference, interview audio, or visual draft may be harmless in isolation but sensitive inside a project. Use descriptive notes carefully, avoid storing unnecessary personal details, and remove material when it no longer has a clear purpose.',
    ],
  },
  {
    title: 'Notifications That Help',
    body: [
      'Good notification settings keep important messages from disappearing into noise. Security alerts, account changes, failed exports, service status, and takedown-related messages should remain enabled. Marketing updates or product tips can be reduced if they distract you. The goal is not to receive fewer messages at all costs; the goal is to make sure the messages that matter are easy to notice.',
      'If you use DownloadDash for client work, route account emails to an inbox you check regularly. A rights request, failed download report, or export confirmation can become time-sensitive. Missing those messages can create confusion later, especially when a project depends on a file that needs permission review.',
    ],
  },
  {
    title: 'Exports, Backups, and Ownership',
    body: [
      'An account record is not the same as a long-term archive. DownloadDash helps you manage media, but important files should also live in storage you control. Export finished assets, master files, captions, transcripts, and permission notes to a cloud folder, external drive, or internal archive that matches your own backup policy.',
      'Keep at least two copies of important material and store one copy away from your everyday device. Check backups occasionally by opening a few files, not just by confirming that a folder exists. A backup that cannot be restored is only a comforting label, not protection.',
    ],
  },
  {
    title: 'Account Cleanup',
    body: [
      'Every few weeks, review your saved content and remove items with no clear reason to stay. Delete duplicates, test saves, failed experiments, and old references that no longer connect to a project. Cleanup reduces risk and makes search results more useful because fewer irrelevant files compete with the things you actually need.',
      'When deleting content, remember that removal from your account does not remove the original post from its source platform. It only removes your saved copy or account record inside DownloadDash. If a file is important, export and verify the backup before deleting it from your library.',
    ],
  },
  {
    title: 'Teams and Professional Use',
    body: [
      'For teams, decide which files are drafts, which are approved, and which are only references. Labels such as Approved, Needs Edit, Pending Credit, Licensed, or Archive Ready prevent accidental reuse. A team can move final media to a shared folder while keeping individual DownloadDash accounts focused on personal saving and research.',
      'Professional workflows benefit from a simple rule: no file should move into a public campaign, client deliverable, or repost queue without source context. Keep creator names, platform links, dates, and permission details close to the asset. That habit protects your team and respects the people who made the original media.',
    ],
  },
  {
    title: 'When Something Looks Wrong',
    body: [
      'If account data does not load, first refresh the page and check whether you are signed in with the expected email address. Browser extensions, blocked cookies, network filters, or expired sessions can make a healthy account look empty. Try another browser or device if the issue repeats.',
      'When contacting support, include your account email, device type, browser, approximate time, and a short description of what you expected to see. Do not send passwords or private authentication codes. For download issues, include the platform and error message rather than a long chain of guesses.',
    ],
  },
];

export default function Account() {
  const [user, setUser] = useState(null);
  const [downloadCount, setDownloadCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestView, setIsGuestView] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (!isAuth) {
          setIsGuestView(true);
          return;
        }

        const activeUser = await downloadDash.auth.me();
        setUser(activeUser);
        const [historyData, savedData] = await Promise.all([
          downloadDash.entities.DownloadHistory.filter({ user_email: activeUser.email }, '-created_date', 50),
          downloadDash.entities.SavedContent.filter({ user_email: activeUser.email }, '-created_date', 50),
        ]);
        setDownloadCount(historyData?.length || 0);
        setSavedCount(savedData?.length || 0);
      } catch (e) {
        console.log('Account load error', e);
        setIsGuestView(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const profileItems = useMemo(
    () => [
      { label: 'Profile', value: user?.full_name || user?.email || 'Guest visitor', icon: User },
      { label: 'Email', value: user?.email || 'Sign in to connect an email', icon: Mail },
      {
        label: 'Member Since',
        value: user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'Available after sign in',
        icon: Fingerprint,
      },
    ],
    [user]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-cyan-200">
        Loading account...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.14),transparent_28%)]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Account and Media Preferences</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold">Account Settings</h1>
              <p className="mt-4 max-w-3xl text-lg text-gray-300">
                Manage the personal side of DownloadDash: identity, privacy habits, saved media responsibility,
                notifications, exports, and account cleanup.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {isGuestView ? (
                  <Button className="bg-emerald-500 text-black hover:bg-emerald-400" onClick={() => downloadDash.auth.redirectToLogin()}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Sign in to manage account
                  </Button>
                ) : (
                  <Button className="bg-emerald-500 text-black hover:bg-emerald-400" asChild>
                    <Link to={createPageUrl('Dashboard')}>
                      <MonitorSmartphone className="mr-2 h-4 w-4" />
                      Open Dashboard
                    </Link>
                  </Button>
                )}
                {!isGuestView && (
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => downloadDash.auth.logout()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-5">
              <div className="space-y-3">
                {profileItems.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Icon className="h-4 w-4 text-emerald-300" />
                      {label}
                    </div>
                    <div className="mt-2 break-words font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <Metric icon={Download} label="Downloads Tracked" value={downloadCount} tone="text-cyan-300" />
          <Metric icon={Vault} label="Saved Items" value={savedCount} tone="text-emerald-300" />
          <Metric icon={Settings2} label="Preference Areas" value={4} tone="text-blue-300" />
          <Metric icon={RotateCcw} label="Cleanup Rhythm" value="Weekly" tone="text-amber-300" />
        </div>

        <section className="grid lg:grid-cols-[0.82fr_1.18fr] gap-6 mb-10">
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 h-fit">
            <SlidersHorizontal className="h-8 w-8 text-blue-300" />
            <h2 className="mt-4 text-2xl font-bold">Account Controls That Matter</h2>
            <p className="mt-3 text-gray-400">
              DownloadDash accounts are designed for people who save real media, not empty profile pages. These controls
              keep your files understandable, private, and easier to move into responsible projects.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {preferenceCards.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-white/10 bg-black/40 p-4">
                  <Icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-bold">Quick Account Checklist</h2>
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              {[
                'Use a recognizable account email.',
                'Keep security alerts enabled.',
                'Export important files to storage you control.',
                'Add permission notes before sharing media.',
                'Remove duplicates and abandoned test files.',
                'Keep captions or transcripts with speech-based media.',
                'Separate personal saves from team-approved assets.',
                'Contact support early for privacy or takedown concerns.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/40 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-zinc-950 p-6">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Original Account Guide</p>
            <h2 className="mt-3 text-3xl font-bold">Using Your Account With Care</h2>
            <p className="mt-3 text-gray-400">
              The sections below are written specifically for DownloadDash users who keep videos, images, and audio for
              reference, editing, archiving, or approved reuse.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {accountGuide.map((section) => (
              <article key={section.title} className="border-t border-white/10 pt-5">
                <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 36)} className="text-sm leading-6 text-gray-400">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
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

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div className="mt-4 text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
