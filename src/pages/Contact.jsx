import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, ShieldCheck, FileText, ArrowUpRight, Clock3 } from 'lucide-react';

const contactCards = [
  {
    icon: <Mail className="h-7 w-7" />,
    title: 'General support',
    subtitle: 'Downloads, app behavior, and account help',
    email: 'support@downloaddash.store',
  },
  {
    icon: <ShieldCheck className="h-7 w-7" />,
    title: 'Legal and rights',
    subtitle: 'Privacy, copyright, compliance, and policy concerns',
    email: 'legal@downloaddash.store',
  },
  {
    icon: <MessageCircle className="h-7 w-7" />,
    title: 'Response expectations',
    subtitle: 'Please include device, page URL, and the exact issue you saw',
    detail: 'Typical response target: 2-3 business days.',
  },
];

const beforeYouWrite = [
  'Include the page URL where the issue happened.',
  'Tell us whether you were on Android, iPhone, tablet, or desktop.',
  'Say whether the problem was a download, install, login, or policy issue.',
  'If a rights-holder request is involved, include enough detail to identify the content clearly.',
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <section className="border-b border-blue-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.14),_transparent_28%),linear-gradient(180deg,#0f1219_0%,#0d0d0f_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-22 grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-blue-200/70 mb-4">Contact and support</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">A real contact page should feel like a service desk, not another hero section.</h1>
            <p className="text-lg text-slate-300 leading-8 max-w-3xl">
              This page is now deliberately different from the homepage. It exists for support, rights-holder communication, and trust. It should help people reach the right inbox with enough detail to get a useful reply.
            </p>
          </div>
          <div className="rounded-[2rem] border border-blue-300/20 bg-black/30 p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-blue-100 mb-5">
              <Clock3 className="h-6 w-6" />
              <p className="font-semibold">Support rhythm</p>
            </div>
            <p className="text-slate-300 leading-8">
              The fastest path to help is a short, specific message. Include what you were trying to do, where it happened, and what device you were using. That reduces the back-and-forth and makes support more useful for everyone.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {contactCards.map((card, index) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-[2rem] border border-blue-300/15 bg-gradient-to-br from-[#11141d] to-[#0e1015] p-7"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-300/10 text-blue-100 flex items-center justify-center mb-5">
                {card.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{card.title}</h2>
              <p className="text-slate-300 leading-7 mb-4">{card.subtitle}</p>
              {card.email ? (
                <a href={`mailto:${card.email}`} className="inline-flex items-center gap-2 text-blue-200 hover:text-blue-100 font-semibold">
                  {card.email}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <p className="text-blue-200 font-semibold">{card.detail}</p>
              )}
            </motion.article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3 mb-4 text-blue-100">
              <FileText className="h-6 w-6" />
              <h2 className="text-2xl font-bold text-white">Before you email</h2>
            </div>
            <div className="space-y-4">
              {beforeYouWrite.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-300 leading-7">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Important boundary</h2>
            <p className="text-slate-300 leading-8 mb-5">
              DownloadDash cannot help users download private, restricted, or copyrighted material they do not have permission to use. If your request depends on bypassing account protections or platform restrictions, support will not treat that as a valid use case.
            </p>
            <a
              href="mailto:support@downloaddash.store?subject=DownloadDash%20Support%20Request"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-300 text-slate-950 px-5 py-3 font-semibold hover:opacity-90"
            >
              Email Support
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
