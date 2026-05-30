import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import downloadDash from '@/api/downloadDashClient';
import AdBanner from '@/components/AdBanner';
import { Button } from '@/components/ui/button';

export default function Account() {
  const [user, setUser] = useState(null);
  const [downloadCount, setDownloadCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (!isAuth) return downloadDash.auth.redirectToLogin();
        const u = await downloadDash.auth.me();
        setUser(u);
        const [historyData, savedData] = await Promise.all([
          downloadDash.entities.DownloadHistory.filter({ user_email: u.email }, '-created_date', 1),
          downloadDash.entities.SavedContent.filter({ user_email: u.email }, '-created_date', 1),
        ]);
        setDownloadCount(historyData?.length || 0);
        setSavedCount(savedData?.length || 0);
      } catch (e) {
        console.log('Account load error', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-purple-400">Loading account…</div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Account Settings
            </h1>
            <p className="text-gray-400 mt-1">Manage your profile, privacy, and saved media preferences.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10" onClick={() => downloadDash.auth.logout()}>
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="col-span-2 bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-purple-500/10">
            <h2 className="text-lg font-semibold text-white mb-2">Profile</h2>
            <p className="text-gray-400">{user?.full_name || user?.email}</p>
            <p className="text-gray-500 text-sm mt-2">Member since: {user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'Unknown'}</p>
            <div className="mt-4">
              <Link to="/dashboard">
                <Button className="bg-purple-600 hover:bg-purple-700">Open Dashboard</Button>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-purple-500/10">
            <h3 className="text-sm text-gray-400">Activity</h3>
            <div className="mt-2 text-white text-2xl font-bold">{downloadCount}</div>
            <div className="text-gray-500 text-sm">Total Downloads</div>
            <div className="mt-4 text-white text-2xl font-bold">{savedCount}</div>
            <div className="text-gray-500 text-sm">Saved Items</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-purple-500/10 prose prose-invert max-w-none text-sm">
          <h2>About Your Account — a practical guide</h2>
          <p>
            Your account is the place where activity meets intention. Beyond the numbers and recent files, this page
            explains the choices available to you for privacy, retention, and ownership of the media you save. It also
            explains how DownloadDash treats your information and what tools we provide to help you keep your collection
            lean, searchable, and responsibly managed.
          </p>

          <p>
            The most important idea to keep in mind is this: storing a file in DownloadDash is not the same as giving it
            permanent public distribution. Our platform is a utility for working with publicly available links and for
            keeping copies for personal, offline, or approved collaborative use. If you plan to publish or distribute an
            asset beyond personal use, confirm permissions and attribute creators as required by the source platform or
            license.
          </p>

          <h3 className="mt-4">Data Retention and Export</h3>
          <p>
            We retain items according to the rules described in our help pages and privacy policy. If you want a copy of
            your saved content outside DownloadDash, use the export options in this section. Exporting moves a copy to a
            place you control; after an export you should verify the integrity of the files and confirm they are stored
            under your backup and access policies. Exports are useful when you need long-term archival or want to hand
            assets to a collaborator.
          </p>

          <h3 className="mt-4">Privacy Controls and Sharing</h3>
          <p>
            Your account lets you choose how broadly certain metadata is visible. By default, saved items are private to
            your account and viewable only when you are signed in. When you share a saved item, a short-lived link can be
            generated; use it for temporary review rather than permanent publication. If you need team-level sharing, we
            recommend exporting to a controlled cloud folder and configuring access with the provider’s permission
            settings instead of sharing raw downloadable links publicly.
          </p>

          <h3 className="mt-4">Security and Best Practices</h3>
          <p>
            Keep your account secured with a strong, unique password and use two-factor authentication when available. If
            you suspect an unauthorized sign-in or you see unfamiliar activity, change your password immediately and
            contact support. Regularly prune files you no longer need — old, forgotten downloads are often the root of
            accidental reposts or confusion about ownership.
          </p>

          <h3 className="mt-4">Account Deletion and Data Removal</h3>
          <p>
            If you choose to delete your account, follow the account deletion flow in settings. Deleting an account removes
            your profile information and typically removes references to saved content; depending on the backend and caching
            rules, copies may persist in backup systems for a short period before permanent removal. We publish the expected
            timelines on the privacy page so you know what to expect.
          </p>

          <h3 className="mt-4">Handling Permission and Copyright Requests</h3>
          <p>
            If a rights holder contacts you about saved material, treat the request seriously. We provide an escalation
            path to our support team and guidance on how to verify and remove disputed material. Keeping a short note
            with each saved file (who granted permission and when) simplifies resolution and shows good faith if a
            formal takedown is requested.
          </p>

          <h3 className="mt-4">Notifications and Preferences</h3>
          <p>
            Control what messages you receive from DownloadDash in the preferences area. We recommend enabling security
            alerts and administrative notices (status, scheduled maintenance), while allowing you to mute marketing emails
            if you prefer. Clear preferences help keep important notifications visible without clutter.
          </p>

          <p>
            This account page is a living document — we’ll add tools and guidance as workflows evolve and as platforms
            change the formats they expose. If you have suggestions for what belongs here (export formats, integration
            options, or team workflows), contact our support team and we’ll consider it for the next update.
          </p>
          <h3 className="mt-4">Practical Account Hygiene</h3>
          <p>
            Good account hygiene is similar to good file hygiene. Periodically review stored credentials on services you
            linked to DownloadDash and revoke any that are no longer needed. Remove old or unused export destinations and
            tidy notification rules so you only receive messages that matter. If you share a device, sign out after use and
            enable a screen lock to keep your account secure.
          </p>

          <h3 className="mt-4">Working With Teams and Shared Projects</h3>
          <p>
            For collaborative projects, consider a workflow where one person is responsible for curating a shared archive
            and others have sandbox access. Export final assets to a shared cloud folder with clear naming conventions
            and permission controls. This reduces accidental overwrite, ensures a single source of truth, and keeps the
            Dashboard focused on individual activity rather than shared distribution.
          </p>

          <h3 className="mt-4">Troubleshooting Account Issues</h3>
          <p>
            If you cannot sign in, check that your browser is allowing third-party cookies (if required by your auth
            provider), and verify any ad-blockers or privacy extensions aren’t interfering. For problems with downloads or
            content visibility, consult the troubleshooting guide and include sample links when contacting support. The
            more context you provide (link, timestamp, and error message), the faster our team can help.
          </p>

          <h3 className="mt-4">Support and Contact</h3>
          <p>
            If you have an immediate privacy, security, or takedown concern, use the contact paths in the footer and mark
            your message as urgent. For general feedback about workflows or feature requests, our product team reviews
            suggestions and prioritizes changes based on user impact. We appreciate concise, concrete examples of how a
            small tool change can save minutes every day — those ideas often lead to the most useful improvements.
          </p>

          <p>
            Thank you for using DownloadDash. This account page is built to help you make thoughtful choices about the
            media you keep — not to dictate them. Use these sections as quick references, and return here when you need
            another look at policy, export, or retention best practices.
          </p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}
