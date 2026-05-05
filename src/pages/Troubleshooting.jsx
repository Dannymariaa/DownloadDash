import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, ShieldAlert, Smartphone, ArrowDownCircle } from 'lucide-react';

const diagnosticSteps = [
  {
    title: 'Check the source first',
    body: 'Open the original post or video in a normal browser session and confirm it still exists, is still public, and is not age-gated, region-blocked, or removed.',
  },
  {
    title: 'Check what failed',
    body: 'A metadata failure is different from a final file failure. If the title loads but the final file breaks, the source may be applying stronger checks at delivery time.',
  },
  {
    title: 'Check the device path',
    body: 'If the issue is app installation rather than media download, verify whether you are using a web app install flow or an Android APK flow. They are not the same thing.',
  },
  {
    title: 'Check timing and environment',
    body: 'Temporary upstream blocking, rate limiting, expired backend cookies, or old-device certificate trust problems can all create failures that look similar to end users.',
  },
];

const issueGrid = [
  {
    icon: <Search className="h-7 w-7" />,
    title: 'Link resolves to nothing',
    body: 'Usually a removed, private, malformed, or source-restricted URL. Re-check the original post first.',
  },
  {
    icon: <ArrowDownCircle className="h-7 w-7" />,
    title: 'Download starts but file breaks',
    body: 'Often a sign that the backend can see metadata but is being challenged on final file delivery.',
  },
  {
    icon: <ShieldAlert className="h-7 w-7" />,
    title: 'Old phone says site is unsafe',
    body: 'Very old Android and iOS versions may lack current certificate trust or TLS support, even when the site itself is configured correctly.',
  },
  {
    icon: <Smartphone className="h-7 w-7" />,
    title: 'Install package parse error',
    body: 'That usually means the APK is missing, invalid, unsigned, or not actually an APK file suitable for the device.',
  },
];

export default function Troubleshooting() {
  return (
    <div className="min-h-screen bg-[#110807] text-white">
      <section className="border-b border-rose-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,#1a0b0c_0%,#110807_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-22 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-rose-200/70 mb-4">Troubleshooting guide</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">A diagnostic page for when things go wrong.</h1>
            <p className="text-lg text-slate-300 leading-8 max-w-3xl">
              This page should not look like a landing page because it has a different job. It is a support workflow: identify the type of failure, understand the likely cause, and then decide whether the issue is with the source, the device, or the backend.
            </p>
          </div>
          <div className="rounded-[2rem] border border-rose-300/20 bg-black/30 p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-rose-100 mb-5">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-semibold">Best support mindset</p>
            </div>
            <p className="text-slate-300 leading-8">
              The goal is not to assume every failure means the site is broken. The goal is to separate source-side blocking, platform changes, device issues, and packaging mistakes into categories that users can understand.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-3xl font-bold text-white mb-5">Diagnostic order</h2>
            <div className="space-y-5">
              {diagnosticSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-rose-300/15 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-rose-200/60 mb-2">Check {index + 1}</p>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-300 leading-7">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {issueGrid.map((issue, index) => (
              <motion.article
                key={issue.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[2rem] border border-rose-300/15 bg-gradient-to-br from-[#1a1010] to-[#120c0d] p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-300/10 text-rose-100 flex items-center justify-center mb-4">
                  {issue.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{issue.title}</h3>
                <p className="text-slate-300 leading-7">{issue.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
