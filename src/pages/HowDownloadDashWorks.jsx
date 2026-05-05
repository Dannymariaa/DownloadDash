import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BookOpen, Link2, SearchCheck, Download, Shield, ArrowRight, Orbit } from 'lucide-react';

const steps = [
  {
    icon: <Link2 className="h-7 w-7" />,
    title: 'Input stage',
    body: 'A user starts with a public URL from a supported source. DownloadDash is built around public-link workflows, which means it is not trying to break into private, login-walled, or permission-restricted media.',
  },
  {
    icon: <SearchCheck className="h-7 w-7" />,
    title: 'Resolution stage',
    body: 'The backend checks what the source is willing to expose at that moment: metadata, previews, formats, qualities, or audio variants. If the source changes behavior, the result can change too.',
  },
  {
    icon: <Download className="h-7 w-7" />,
    title: 'Selection stage',
    body: 'Instead of pretending every media request always leads to the same file, DownloadDash presents the returned options. That is more honest and gives users a better idea of what is actually available.',
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Responsibility stage',
    body: 'The user remains responsible for what they save and how they use it. Public access is not automatic permission for every kind of copying, sharing, or redistribution.',
  },
];

export default function HowDownloadDashWorks() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <section className="relative overflow-hidden border-b border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.20),_transparent_30%),linear-gradient(180deg,#07111f_0%,#050816_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100 mb-6">
              <BookOpen className="h-4 w-4" />
              Workflow explainer
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">How DownloadDash works, from pasted link to returned media option.</h1>
            <p className="text-lg text-slate-300 leading-8 max-w-2xl">
              This page has a different role from the homepage. The homepage introduces the product. This page explains the mechanics and the limits. It is here for people who want a clearer picture of what the tool is actually doing behind the interface.
            </p>
          </div>
          <div className="rounded-[2rem] border border-emerald-300/20 bg-black/30 backdrop-blur-xl p-8">
            <div className="flex items-center gap-3 mb-5 text-emerald-100">
              <Orbit className="h-6 w-6" />
              <p className="font-semibold">Core principle</p>
            </div>
            <p className="text-slate-300 leading-8">
              DownloadDash is a resolver, not a hidden content warehouse. It receives a supported public link, asks the configured backend what is available, and then reflects the returned options back to the user. If a platform changes behavior, blocks the request, or exposes fewer formats, DownloadDash should tell the truth rather than fake success.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="relative before:absolute before:left-[26px] before:top-4 before:bottom-4 before:w-px before:bg-emerald-300/25">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative pl-20"
              >
                <div className="absolute left-0 top-0 w-14 h-14 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-100 flex items-center justify-center">
                  {step.icon}
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-[#0b1322] p-7">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/70 mb-2">Step {index + 1}</p>
                  <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                  <p className="text-slate-300 leading-8">{step.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-3xl font-bold text-white mb-4">Why this matters</h2>
            <p className="text-slate-300 leading-8 mb-4">
              Many utility sites make the whole experience feel magical and consequence-free. That creates confusion when a format disappears, a platform blocks the backend, or a file request fails after metadata was found. This page exists to reduce that confusion.
            </p>
            <p className="text-slate-300 leading-8">
              In other words: the product becomes easier to trust when users understand the workflow. A good explanation is part of the product, not an afterthought.
            </p>
          </div>
          <div className="rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Next page to read</h2>
            <p className="text-slate-300 leading-8 mb-6">
              If you now understand the workflow but still want to know why downloads fail in practice, the troubleshooting guide is the most useful follow-up page.
            </p>
            <Link
              to={createPageUrl('Troubleshooting')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-slate-950 px-5 py-3 font-semibold hover:opacity-90"
            >
              Open Troubleshooting In New Tab
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
