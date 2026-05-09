import React from 'react';
import { Download, FileText, Mail, Smartphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const APK_URL = '/downloads/DownloadDash.apk';

const appBenefits = [
  'Public-link workflows',
  'Cleaner mobile navigation',
  'Saved collections when account features are available',
  'Privacy-conscious design',
  'Transparent media workflow',
];

export default function AppDownload() {
  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <section className="border-b border-purple-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(147,51,234,0.22),_transparent_30%),linear-gradient(180deg,#11101a_0%,#07070a_100%)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-purple-200/80">DownloadDash Android App</p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">A cleaner mobile path for public-link workflows.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              The Android app experience is designed for streamlined mobile navigation, public-link guidance, saved collections, and transparent media processing.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={APK_URL}
                download="DownloadDash.apk"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Download Android APK
              </a>
              <Link
                to={createPageUrl('HelpCenter')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300/25 px-5 py-3 font-semibold text-purple-100 hover:bg-purple-300/10"
              >
                <FileText className="h-4 w-4" />
                Read install help
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <img
              src="/assets/real-site-screenshots/mobile-preview.png"
              alt="DownloadDash mobile preview"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-purple-300/15 bg-white/[0.04] p-7">
          <div className="mb-5 flex items-center gap-3 text-purple-100">
            <Smartphone className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Mobile app focus</h2>
          </div>
          <div className="space-y-3">
            {appBenefits.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-black/20 p-4 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-7">
          <div className="mb-5 flex items-center gap-3 text-purple-100">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Before installing</h2>
          </div>
          <p className="leading-8 text-slate-300">
            Only install a real signed DownloadDash APK from the official DownloadDash site. If the APK file is not available yet, use the browser-based web app install flow until a signed Android release is published.
          </p>
          <a
            href="mailto:support@downloaddash.store?subject=DownloadDash%20Android%20App%20Question"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-300 px-5 py-3 font-semibold text-slate-950 hover:opacity-90"
          >
            <Mail className="h-4 w-4" />
            Ask support
          </a>
        </div>
      </section>
    </div>
  );
}
