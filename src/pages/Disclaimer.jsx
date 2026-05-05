import React from 'react';
import { TriangleAlert, EyeOff, ShieldQuestion, Mail } from 'lucide-react';

const sections = [
  {
    title: '1. General information only',
    body: 'DownloadDash provides public-link media utility tools, installation guidance, and educational content. Information on the site is provided for general informational purposes and should not be treated as legal advice or as a guarantee that every workflow is permitted everywhere.',
  },
  {
    title: '2. No guarantee of availability',
    body: 'We do not guarantee that every platform, post, media file, format, or device workflow will remain available. Results depend on source behavior, backend stability, browser support, and device compatibility.',
  },
  {
    title: '3. User responsibility',
    body: 'Users are responsible for ensuring they have the right to access, download, store, or reuse any content processed through DownloadDash. Public visibility does not automatically grant reuse permission.',
  },
  {
    title: '4. Third-party services and platforms',
    body: 'DownloadDash is not affiliated with YouTube, TikTok, Instagram, Facebook, X, Reddit, Pinterest, Telegram, or other referenced third-party platforms. Their rules, content availability, and technical behavior may change at any time.',
  },
  {
    title: '5. No warranty',
    body: 'The service is provided on an as-is and as-available basis. We disclaim warranties to the extent permitted by law, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
  },
];

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-[#f8eff2] text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-[0.34fr_0.66fr] gap-8">
        <aside className="lg:sticky lg:top-24 self-start rounded-[2rem] border border-rose-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-5">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-rose-700 mb-3">Legal page</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-950 mb-4">Disclaimer</h1>
          <p className="text-slate-600 leading-7 mb-5">Last updated: May 5, 2026</p>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><EyeOff className="h-4 w-4 text-rose-700" /> No promise of universal access</div>
            <div className="flex items-center gap-3"><ShieldQuestion className="h-4 w-4 text-rose-700" /> User responsibility remains in place</div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-rose-700" /> Contact for clarification</div>
          </div>
        </aside>

        <main className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-rose-200 bg-white p-7 md:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-bold text-slate-950 mb-3">{section.title}</h2>
              <p className="text-slate-700 leading-8">{section.body}</p>
            </section>
          ))}
          <section className="rounded-[2rem] border border-rose-200 bg-slate-950 text-white p-7 md:p-8">
            <h2 className="text-2xl font-bold mb-3">Contact</h2>
            <p className="text-slate-300 leading-8">
              Questions about this Disclaimer can be sent to <a className="text-rose-300 hover:text-rose-200" href="mailto:legal@downloaddash.store">legal@downloaddash.store</a> or through the Contact page.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
