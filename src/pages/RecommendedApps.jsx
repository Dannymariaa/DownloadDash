import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BookOpen, Compass, FileText, Shield, Wrench, ArrowRight, Sparkles } from 'lucide-react';

const guidePillars = [
  {
    icon: <Compass className="h-6 w-6" />,
    title: 'Orientation First',
    body: 'Start here if you want the big picture. These guides explain what DownloadDash is, what it is not, and how to move through the site without guessing.',
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: 'Problem Solving',
    body: 'Use the troubleshooting and support content when downloads fail, device installs feel confusing, or a platform behaves differently than expected.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Trust And Rights',
    body: 'Read the responsible-use, privacy, terms, and disclaimer pages to understand the site’s boundaries, user responsibilities, and support channels.',
  },
];

const guideRoutes = [
  {
    page: 'HowDownloadDashWorks',
    eyebrow: 'Workflow guide',
    title: 'How DownloadDash Works',
    summary: 'A process walkthrough from public link input to returned file options, including where limitations and source-side restrictions appear.',
  },
  {
    page: 'SupportedPlatforms',
    eyebrow: 'Coverage guide',
    title: 'Supported Platforms',
    summary: 'A platform-and-device explainer that clarifies what types of public links and client environments the project is designed around.',
  },
  {
    page: 'Troubleshooting',
    eyebrow: 'Support guide',
    title: 'Troubleshooting',
    summary: 'A diagnostic page for broken links, failed file delivery, old-device certificate warnings, and installation confusion.',
  },
  {
    page: 'ResponsibleUse',
    eyebrow: 'Policy guide',
    title: 'Responsible Use',
    summary: 'A creator-rights and lawful-use guide that explains why public access is not the same as automatic permission.',
  },
  {
    page: 'Blog',
    eyebrow: 'Editorial hub',
    title: 'Blog',
    summary: 'Original articles answering common questions about video saving, mobile installation, troubleshooting, and safe use.',
  },
  {
    page: 'Contact',
    eyebrow: 'Support page',
    title: 'Contact',
    summary: 'A direct path for support, legal, privacy, and rights-holder concerns, with clear expectations for what to include in a request.',
  },
];

export default function RecommendedApps() {
  return (
    <div className="min-h-screen bg-[#08050f] text-white">
      <section className="relative overflow-hidden border-b border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.20),_transparent_30%),linear-gradient(180deg,#090512_0%,#06040c_100%)]">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 mb-6">
              <BookOpen className="h-4 w-4" />
              DownloadDash Guides
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              The content hub for understanding DownloadDash before using the tool.
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-8 max-w-3xl">
              This page is intentionally not a clone of the homepage. It acts like a guide index: part editorial desk, part help center, and part policy map. If someone lands here from search or from the navigation, they should immediately understand where to go next and why each page exists.
            </p>
          </div>

          <div className="rounded-[2rem] border border-cyan-300/20 bg-black/40 backdrop-blur-xl p-7 shadow-2xl shadow-cyan-900/20">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70 mb-4">What this page is for</p>
            <div className="space-y-4">
              {guidePillars.map((pillar) => (
                <div key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3 text-cyan-200 mb-3">
                    {pillar.icon}
                    <h2 className="text-lg font-semibold text-white">{pillar.title}</h2>
                  </div>
                  <p className="text-slate-300 leading-7 text-sm">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 md:py-18">
        <div className="grid gap-6 lg:grid-cols-2">
          {guideRoutes.map((item, index) => (
            <motion.article
              key={item.page}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group rounded-[2rem] border border-fuchsia-400/15 bg-gradient-to-br from-[#130a1f] via-[#0d0918] to-[#09060f] p-7 hover:border-cyan-300/35 transition-colors"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-200/60 mb-3">{item.eyebrow}</p>
              <h2 className="text-2xl font-bold text-white mb-3">{item.title}</h2>
              <p className="text-slate-300 leading-7 mb-6">{item.summary}</p>
              <Link
                to={createPageUrl(item.page)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-cyan-100 font-semibold hover:bg-cyan-300/15"
              >
                Open Page In New Tab
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(168,85,247,0.10))] p-8 md:p-10 grid md:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
              <Sparkles className="h-8 w-8 text-cyan-100" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Why this structure matters</h2>
            <p className="text-slate-300 leading-7">
              Search visitors, ad reviewers, and everyday users should be able to tell the difference between your homepage, your guide hub, your legal pages, and your editorial content. That separation improves trust because each page has a distinct job.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Homepage: broad overview and entry point.',
              'Guides page: content index and page directory.',
              'Blog: editorial and SEO-friendly articles.',
              'Legal and contact pages: trust, rights, and support details.',
            ].map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-slate-200 leading-7">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
