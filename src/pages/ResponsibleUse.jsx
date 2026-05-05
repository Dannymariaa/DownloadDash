import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Scale, UserCheck, Copyright, FileWarning, BadgeCheck } from 'lucide-react';

const principles = [
  {
    icon: <UserCheck className="h-7 w-7" />,
    title: 'Permission matters more than convenience',
    body: 'A public link can be technically reachable without giving someone a universal right to save, share, or repost the media. Permission and rights still matter.',
  },
  {
    icon: <Copyright className="h-7 w-7" />,
    title: 'Creator rights do not disappear on public posts',
    body: 'Creators can still hold copyright and usage rights even when their content is visible in public feeds or search results.',
  },
  {
    icon: <Scale className="h-7 w-7" />,
    title: 'Law and platform rules both count',
    body: 'Responsible use means considering both your local laws and the rules of the original platform, not just whether a tool can technically return a file.',
  },
];

const scenarios = [
  ['Usually more defensible', 'Saving your own work, creator backups, licensed files, or internal review copies where permission already exists.'],
  ['Needs more caution', 'Educational, research, or archival use where laws and licenses may differ by region and context.'],
  ['Not what this site should encourage', 'Unauthorized reposting, impersonation, piracy, scraping private material, or bypassing restrictions you were not meant to bypass.'],
];

export default function ResponsibleUse() {
  return (
    <div className="min-h-screen bg-[#07110f] text-white">
      <section className="border-b border-lime-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(163,230,53,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_30%),linear-gradient(180deg,#081613_0%,#07110f_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-22 grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-lime-200/70 mb-4">Rights and responsibilities</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">Responsible use is a product feature, not a legal footnote.</h1>
            <p className="text-lg text-slate-300 leading-8 max-w-3xl">
              This page is styled more like a manifesto than a landing page because it exists to communicate standards. DownloadDash should feel clear about what it supports and equally clear about what it does not want to encourage.
            </p>
          </div>
          <div className="rounded-[2rem] border border-lime-300/20 bg-black/30 p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-lime-100 mb-5">
              <Shield className="h-6 w-6" />
              <p className="font-semibold">Short version</p>
            </div>
            <p className="text-slate-300 leading-8">
              Use DownloadDash for content you own, content you licensed, content you have permission to save, or content you are otherwise legally allowed to use. If that is not true, stop and reassess before downloading anything.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {principles.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-[2rem] border border-lime-300/15 bg-gradient-to-br from-[#0f1a17] to-[#0b1210] p-7"
            >
              <div className="w-14 h-14 rounded-2xl bg-lime-300/10 text-lime-100 flex items-center justify-center mb-5">
                {item.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{item.title}</h2>
              <p className="text-slate-300 leading-8">{item.body}</p>
            </motion.article>
          ))}
        </div>

        <div className="rounded-[2rem] border border-white/10 overflow-hidden">
          <div className="grid md:grid-cols-[0.75fr_1.25fr]">
            <div className="p-8 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 mb-4 text-lime-100">
                <BadgeCheck className="h-6 w-6" />
                <h2 className="text-2xl font-bold text-white">Scenario guide</h2>
              </div>
              <p className="text-slate-300 leading-8">
                Users often need practical examples more than abstract warnings. The categories on the right make it easier to understand what kinds of use cases are relatively safer and which ones should raise red flags immediately.
              </p>
            </div>
            <div className="divide-y divide-white/10 bg-black/20">
              {scenarios.map(([title, body]) => (
                <div key={title} className="p-7">
                  <div className="flex items-start gap-3">
                    <FileWarning className="h-5 w-5 text-lime-300 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                      <p className="text-slate-300 leading-7">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
