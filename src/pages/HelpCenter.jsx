import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, LifeBuoy, Mail, SearchCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { helpTopics, knowledgeBaseArticles, supportReplyExamples } from '@/content/enterpriseTrustContent';

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-[#081012] text-white">
      <section className="border-b border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,#0d171a_0%,#081012_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/80">DownloadDash Help Center</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Real support content for public-link questions.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Help for failed links, missing quality options, public access, platform restrictions, and responsible use.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-cyan-300/15 bg-white/[0.04] p-7">
          <div className="mb-5 flex items-center gap-3 text-cyan-100">
            <LifeBuoy className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Popular help topics</h2>
          </div>
          <div className="space-y-4">
            {helpTopics.map(([title, body]) => (
              <article key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 leading-7 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
          <div className="mb-5 flex items-center gap-3 text-cyan-100">
            <SearchCheck className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Knowledge base</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {knowledgeBaseArticles.slice(0, 6).map(([title, body]) => (
              <article key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 p-7">
          <div className="mb-5 flex items-center gap-3 text-cyan-100">
            <HelpCircle className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Support reply examples</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {supportReplyExamples.map(([title, body]) => (
              <article key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
          <Link to={createPageUrl('Contact')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:opacity-90">
            <Mail className="h-4 w-4" />
            Contact support
          </Link>
        </div>
      </section>
    </div>
  );
}
