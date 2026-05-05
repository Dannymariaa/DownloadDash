import React from 'react';
import { Scale, Ban, FileText, BellRing } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of terms',
    body: 'By using DownloadDash, you agree to these Terms of Service. If you do not agree, you should not use the site, its tool pages, or any related web app or account features.',
  },
  {
    title: '2. Permitted use',
    body: 'DownloadDash is intended for lawful personal workflows and other permitted use cases. You are responsible for making sure you have the right to access, save, store, or reuse any content processed through the service.',
  },
  {
    title: '3. Prohibited conduct',
    body: 'Do not use the service to infringe copyright, bypass access controls, violate source-platform rules, distribute unauthorized copies, impersonate others, or engage in harmful or abusive conduct. We may restrict access where misuse is suspected.',
  },
  {
    title: '4. Service availability',
    body: 'The site is provided on an as-is and as-available basis. We do not guarantee that every video, image, audio file, platform workflow, or installation path will work at all times. Upstream changes and source restrictions can affect results.',
  },
  {
    title: '5. Accounts, saved content, and ads',
    body: 'If account features are available, you are responsible for activity associated with your account. DownloadDash may display advertising and may change support features, storage behavior, and UI structure over time.',
  },
  {
    title: '6. Liability and updates',
    body: 'To the fullest extent allowed by law, DownloadDash is not liable for indirect or consequential damages related to the use of the service. We may update these Terms and continued use after changes means you accept the revised version.',
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-[0.34fr_0.66fr] gap-8">
        <aside className="lg:sticky lg:top-24 self-start rounded-[2rem] border border-amber-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
            <Scale className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-700 mb-3">Legal page</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-950 mb-4">Terms of Service</h1>
          <p className="text-slate-600 leading-7 mb-5">Last updated: May 5, 2026</p>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-amber-700" /> Service rules and responsibilities</div>
            <div className="flex items-center gap-3"><Ban className="h-4 w-4 text-amber-700" /> Prohibited conduct and misuse</div>
            <div className="flex items-center gap-3"><BellRing className="h-4 w-4 text-amber-700" /> Updates and service limitations</div>
          </div>
        </aside>

        <main className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-amber-200 bg-white p-7 md:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-bold text-slate-950 mb-3">{section.title}</h2>
              <p className="text-slate-700 leading-8">{section.body}</p>
            </section>
          ))}
          <section className="rounded-[2rem] border border-amber-200 bg-slate-950 text-white p-7 md:p-8">
            <h2 className="text-2xl font-bold mb-3">Questions</h2>
            <p className="text-slate-300 leading-8">
              Questions about these Terms can be sent to <a className="text-amber-300 hover:text-amber-200" href="mailto:support@downloaddash.store">support@downloaddash.store</a> or through the Contact page.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
