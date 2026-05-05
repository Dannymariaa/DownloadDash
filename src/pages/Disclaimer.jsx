import React from 'react';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
    <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
    <div className="space-y-3 text-gray-300 leading-relaxed">{children}</div>
  </section>
);

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-purple-300 font-semibold mb-2">DownloadDash Legal</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Disclaimer</h1>
          <p className="text-gray-400">Last updated: May 5, 2026</p>
        </div>

        <div className="space-y-6">
          <Section title="General Information">
            <p>
              DownloadDash provides public-link media utility tools, device-installation guidance, and educational content. Information on this site is provided for general informational purposes and is not legal advice.
            </p>
          </Section>

          <Section title="No Guarantee Of Availability">
            <p>
              We do not guarantee that every platform, media post, file format, or device workflow will be available at all times. Supported results depend on source availability, platform restrictions, backend stability, and device/browser behavior.
            </p>
          </Section>

          <Section title="User Responsibility">
            <p>
              You are responsible for making sure you have the right to access, save, store, reuse, or share any content you process through DownloadDash. Public visibility does not automatically grant permission for every use.
            </p>
          </Section>

          <Section title="Third-Party Platforms">
            <p>
              DownloadDash is not affiliated with YouTube, TikTok, Instagram, Facebook, Reddit, X, Pinterest, Telegram, or any other third-party platform referenced on the site. Their content availability, rules, and technical behavior can change at any time.
            </p>
          </Section>

          <Section title="No Warranty">
            <p>
              DownloadDash is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We disclaim warranties to the extent permitted by applicable law, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              If you have questions about this Disclaimer, please use the Contact page or email{' '}
              <a className="text-purple-300 hover:text-purple-200" href="mailto:legal@downloaddash.store">
                legal@downloaddash.store
              </a>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
