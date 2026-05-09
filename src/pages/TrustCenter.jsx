import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Accessibility,
  Cookie,
  FileCheck,
  HelpCircle,
  Info,
  Mail,
  Scale,
  Activity,
  BookOpen,
  Compass,
  ListChecks,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { createPageUrl } from '@/utils';

const trustPages = [
  {
    page: 'HelpCenter',
    title: 'Help Center',
    description: 'Popular help topics, knowledge-base answers, and realistic support guidance for public-link issues.',
    icon: BookOpen,
  },
  {
    page: 'SystemStatus',
    title: 'System Status',
    description: 'Operational status for core site surfaces and clear notes about source-platform variability.',
    icon: Activity,
  },
  {
    page: 'PlatformGuides',
    title: 'Platform Guides',
    description: 'Platform-specific guidance for YouTube, TikTok, Instagram, Reddit, Telegram, and more.',
    icon: Compass,
  },
  {
    page: 'AppDownload',
    title: 'Android App',
    description: 'Mobile app positioning, Android APK expectations, and safer install guidance for users.',
    icon: Smartphone,
  },
  {
    page: 'Updates',
    title: 'Updates',
    description: 'A changelog that shows DownloadDash is maintained, improved, and reviewed over time.',
    icon: ListChecks,
  },
  {
    page: 'About',
    title: 'About DownloadDash',
    description: 'An independent public-link media saver focused on clean design, privacy-conscious use, and transparency.',
    icon: Info,
  },
  {
    page: 'SafetyCenter',
    title: 'Safety Center',
    description: 'How DownloadDash avoids unsafe downloader-site patterns like fake buttons, password collection, and confusing redirects.',
    icon: ShieldCheck,
  },
  {
    page: 'TransparencyStatement',
    title: 'Transparency Statement',
    description: 'Clear boundaries for public links, supported workflows, third-party platform changes, and user responsibility.',
    icon: FileCheck,
  },
  {
    page: 'DMCA',
    title: 'DMCA Policy',
    description: 'Rights-holder reporting guidance for copyright concerns and takedown requests.',
    icon: Scale,
  },
  {
    page: 'CookiePolicy',
    title: 'Cookie Policy',
    description: 'A plain-language overview of how cookies and similar browser storage may be used.',
    icon: Cookie,
  },
  {
    page: 'AccessibilityStatement',
    title: 'Accessibility Statement',
    description: 'Our accessibility commitments and the best way to report barriers.',
    icon: Accessibility,
  },
  {
    page: 'FAQ',
    title: 'FAQ',
    description: 'Short answers to common questions about legality, privacy, failed links, and supported devices.',
    icon: HelpCircle,
  },
  {
    page: 'Contact',
    title: 'Contact',
    description: 'Support, legal, privacy, and rights-holder inboxes in one place.',
    icon: Mail,
  },
];

export default function TrustCenter() {
  return (
    <div className="min-h-screen bg-[#090b0f] text-white">
      <section className="border-b border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_30%),linear-gradient(180deg,#10151c_0%,#090b0f_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            <Sparkles className="h-4 w-4" />
            DownloadDash Enterprise Trust Launch Kit
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Trust pages, safety guidance, and policy paths for DownloadDash users.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            This center brings the launch kit into the live app so visitors, advertisers, reviewers,
            and rights holders can find clear answers without digging through support threads.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <img
              src="/assets/ui-previews/help-center-preview.png"
              alt="DownloadDash help center preview"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {trustPages.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.page}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-100">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mb-3 text-xl font-bold text-white">{item.title}</h2>
                <p className="mb-5 leading-7 text-slate-300">{item.description}</p>
                <Link
                  to={createPageUrl(item.page)}
                  className="inline-flex rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-slate-950 hover:opacity-90"
                >
                  Open
                </Link>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
