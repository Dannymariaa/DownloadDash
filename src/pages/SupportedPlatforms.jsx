import React from 'react';
import { motion } from 'framer-motion';
import { Layers3, Smartphone, MonitorSmartphone, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';

const platformBands = [
  {
    title: 'Source coverage',
    icon: <Layers3 className="h-7 w-7" />,
    points: [
      'DownloadDash is structured around supported public-link workflows, not around private account scraping.',
      'Different platforms expose different media types: some return video, some image, some audio, and some a mix depending on the original post.',
      'A public URL can still fail if the original content is removed, region-blocked, or temporarily challenged by the source platform.',
    ],
  },
  {
    title: 'Mobile devices',
    icon: <Smartphone className="h-7 w-7" />,
    points: [
      'Android and iPhone users can browse guides, open supported download pages, and install the web app from their browser when supported.',
      'iPhone and iPad use Add to Home Screen instead of APK installation.',
      'Android APK delivery only makes sense when a real signed package exists and matches the device requirements.',
    ],
  },
  {
    title: 'Desktop and tablet',
    icon: <MonitorSmartphone className="h-7 w-7" />,
    points: [
      'Laptop, desktop, and tablet users generally have the clearest reading and troubleshooting experience because the content pages are easier to scan on larger screens.',
      'Desktop browsers can often install the web app version from the browser menu or address bar.',
      'The downloader still depends on the backend and on platform availability, regardless of screen size.',
    ],
  },
];

const expectationRows = [
  ['Public links only', 'Private or restricted media should fail rather than be bypassed.'],
  ['Format variability', 'Returned qualities and file types depend on what the source currently exposes.'],
  ['Upstream changes', 'A platform can change behavior at any time, which means today’s output may differ from tomorrow’s.'],
  ['Device difference', 'Install prompts, file handling, and browser behavior vary across Android, iOS, tablets, and desktop systems.'],
];

export default function SupportedPlatforms() {
  return (
    <div className="min-h-screen bg-[#0a0b11] text-white">
      <section className="border-b border-orange-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.20),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(244,63,94,0.18),_transparent_30%),linear-gradient(180deg,#140c09_0%,#0a0b11_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-22">
          <p className="text-sm uppercase tracking-[0.28em] text-orange-200/70 mb-4">Coverage guide</p>
          <h1 className="text-4xl md:text-6xl font-black max-w-4xl leading-tight mb-6">Supported platforms should be explained like a matrix, not marketed like magic.</h1>
          <p className="text-lg text-slate-300 leading-8 max-w-3xl">
            This page is intentionally more like a product coverage sheet than a landing page. It exists to show users what kinds of sources and devices DownloadDash is built around, and to explain why support can never be identical across every platform.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {platformBands.map((band, index) => (
            <motion.article
              key={band.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-[2rem] border border-orange-300/15 bg-gradient-to-br from-[#17110f] to-[#0f0d10] p-7"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-300/10 text-orange-100 flex items-center justify-center mb-5">
                {band.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">{band.title}</h2>
              <div className="space-y-4">
                {band.points.map((point) => (
                  <div key={point} className="flex items-start gap-3 text-slate-300 leading-7">
                    <CheckCircle2 className="h-5 w-5 text-orange-300 mt-1 flex-shrink-0" />
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        <div className="rounded-[2rem] border border-white/10 overflow-hidden bg-black/20">
          <div className="grid md:grid-cols-[0.9fr_1.1fr]">
            <div className="p-8 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 mb-4 text-orange-100">
                <LinkIcon className="h-6 w-6" />
                <h2 className="text-2xl font-bold text-white">What users should expect</h2>
              </div>
              <p className="text-slate-300 leading-8">
                A better support page does not just list platform names. It describes what “support” actually means: public-link dependency, device differences, and the possibility of temporary upstream failure.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {expectationRows.map(([title, body]) => (
                <div key={title} className="p-6 md:p-7">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-300 mt-1 flex-shrink-0" />
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
