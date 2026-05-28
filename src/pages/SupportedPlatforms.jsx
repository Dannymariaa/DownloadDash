import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Layers3, Smartphone, MonitorSmartphone, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  RedditIcon,
  TikTokIcon,
  TwitterXIcon,
  YouTubeIcon,
} from '@/components/PlatformIcons';

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

const platformTools = [
  {
    page: 'YouTubeDownloader',
    label: 'YouTube',
    platform: 'youtube',
    Icon: YouTubeIcon,
    support: 'Videos, Shorts, audio, and format options',
    accent: 'border-red-400/30 hover:border-red-300/70 bg-red-500/10 text-red-200',
  },
  {
    page: 'InstagramDownloader',
    label: 'Instagram',
    platform: 'instagram',
    Icon: InstagramIcon,
    support: 'Reels, posts, stories, images, and carousels',
    accent: 'border-pink-400/30 hover:border-pink-300/70 bg-pink-500/10 text-pink-200',
  },
  {
    page: 'TikTokDownloader',
    label: 'TikTok',
    platform: 'tiktok',
    Icon: TikTokIcon,
    support: 'Videos, photos, audio, stories, and public links',
    accent: 'border-cyan-400/30 hover:border-cyan-300/70 bg-cyan-500/10 text-cyan-200',
  },
  {
    page: 'RedditDownloader',
    label: 'Reddit',
    platform: 'reddit',
    Icon: RedditIcon,
    support: 'Posts, hosted video, images, and galleries',
    accent: 'border-orange-400/30 hover:border-orange-300/70 bg-orange-500/10 text-orange-200',
  },
  {
    page: 'PinterestDownloader',
    label: 'Pinterest',
    platform: 'pinterest',
    Icon: PinterestIcon,
    support: 'Pins, images, videos, and public board media',
    accent: 'border-rose-400/30 hover:border-rose-300/70 bg-rose-500/10 text-rose-200',
  },
  {
    page: 'FacebookDownloader',
    label: 'Facebook',
    platform: 'facebook',
    Icon: FacebookIcon,
    support: 'Public videos, reels, stories, and posts',
    accent: 'border-blue-400/30 hover:border-blue-300/70 bg-blue-500/10 text-blue-200',
  },
  {
    page: 'TwitterDownloader',
    label: 'X',
    platform: 'x',
    Icon: TwitterXIcon,
    support: 'Public posts with video, image, and GIF media',
    accent: 'border-white/20 hover:border-white/60 bg-white/10 text-white',
  },
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
        <div className="mb-12">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-orange-200/70 mb-3">Platform tools</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Open the supported downloader pages.</h2>
            <p className="text-slate-300 leading-8 max-w-3xl">
              These are the active platform pages users can open from DownloadDash. Each one is wired to the public-link workflow for that source.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {platformTools.map(({ page, label, platform, Icon, support, accent }, index) => (
              <motion.article
                key={page}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to={createPageUrl(page)}
                  className={`block h-full rounded-2xl border ${accent} p-5 transition-colors`}
                  aria-label={`Open ${label} downloader`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <Icon size={48} />
                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {platform}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-bold text-white">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{support}</p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-white">Open downloader</span>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>

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
