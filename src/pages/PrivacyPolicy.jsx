import React from 'react';
import { Lock, Database, Cookie, Mail } from 'lucide-react';

const sections = [
  {
    title: '1. What this policy covers',
    body: 'This Privacy Policy explains what information DownloadDash may collect when people browse the website, use supported tool pages, install the web app, contact support, or use account-linked features when available. It is written to help ordinary users understand the service, not just to satisfy a checklist.',
  },
  {
    title: '2. Information we may collect',
    body: 'We may collect basic technical information such as browser type, device family, approximate geolocation, diagnostic logs, and usage patterns needed to keep the site reliable. If account features are enabled, we may also store account identifiers, saved-content references, and download history required to provide those features.',
  },
  {
    title: '3. Media link processing',
    body: 'When you submit a media URL, that URL may be sent to our backend or connected service providers so the request can be processed. We use that information to resolve supported public-link workflows and to diagnose failures when needed.',
  },
  {
    title: '4. Cookies, analytics, and advertising',
    body: 'DownloadDash may use cookies or similar technologies for security, preferences, analytics, and advertising. Third-party services such as analytics tools or advertising partners may also use their own technologies according to their policies.',
  },
  {
    title: '5. How information is used',
    body: 'We use collected information to operate the site, improve stability, investigate errors, respond to support requests, protect against abuse, and comply with legal obligations. We do not claim to collect data for no reason; the goal is practical service operation and safety.',
  },
  {
    title: '6. Sharing and retention',
    body: 'We do not describe the service as selling personal information. Some limited information may be shared with hosting, analytics, infrastructure, or support providers when needed to run the service. Data is retained only for as long as reasonably necessary for operations, protection, and compliance.',
  },
  {
    title: '7. Your choices',
    body: 'You can manage cookies in your browser and contact us if you need help with access, correction, or deletion requests associated with account-linked information. Questions can be sent to the support address listed below.',
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#eef4fb] text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-[0.34fr_0.66fr] gap-8">
        <aside className="lg:sticky lg:top-24 self-start rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
            <Lock className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-700 mb-3">Legal page</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-950 mb-4">Privacy Policy</h1>
          <p className="text-slate-600 leading-7 mb-5">Last updated: May 5, 2026</p>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><Database className="h-4 w-4 text-sky-700" /> Data use and processing</div>
            <div className="flex items-center gap-3"><Cookie className="h-4 w-4 text-sky-700" /> Cookies and third-party technologies</div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-sky-700" /> Support and user choices</div>
          </div>
        </aside>

        <main className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 md:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-bold text-slate-950 mb-3">{section.title}</h2>
              <p className="text-slate-700 leading-8">{section.body}</p>
            </section>
          ))}
          <section className="rounded-[2rem] border border-slate-200 bg-slate-950 text-white p-7 md:p-8">
            <h2 className="text-2xl font-bold mb-3">Contact</h2>
            <p className="text-slate-300 leading-8">
              Questions about this Privacy Policy can be sent to <a className="text-sky-300 hover:text-sky-200" href="mailto:support@downloaddash.store">support@downloaddash.store</a> or through the Contact page.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
