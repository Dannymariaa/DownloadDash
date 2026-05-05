import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Smartphone, Wrench, ExternalLink, CheckCircle } from 'lucide-react';

const resourceCards = [
  {
    icon: <BookOpen className="h-7 w-7" />,
    title: 'How DownloadDash Works',
    body:
      'DownloadDash helps you process supported public links and presents the file options returned by the connected backend. The site does not host a giant content library, does not require account scraping, and is meant for personal workflows where you already have permission to save the media.',
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Copyright And Responsible Use',
    body:
      'Only download media you own, created, licensed, or otherwise have legal permission to save. Rights can differ by country and by platform terms, so DownloadDash is designed around public links and user responsibility rather than bypassing platform protections.',
  },
  {
    icon: <Smartphone className="h-7 w-7" />,
    title: 'Phone And Tablet Install Guide',
    body:
      'On modern browsers, DownloadDash can be installed as a web app from the browser menu. Android APK delivery only works when a real signed APK is uploaded, while iPhone and iPad installation uses Safari Add to Home Screen because iOS does not install APK packages.',
  },
  {
    icon: <Wrench className="h-7 w-7" />,
    title: 'Common Troubleshooting',
    body:
      'If a media request fails, the most common causes are expired backend cookies, a blocked upstream service, temporary rate limits, or the original post being removed or made private. For older phones, insecure-connection warnings can also come from outdated device trust stores rather than the website itself.',
  },
];

const qualityChecklist = [
  'A clear homepage that explains what the site does and who it is for.',
  'Accessible privacy, contact, and terms pages linked from every page.',
  'Tool pages supported by real explanatory content rather than ads-only layouts.',
  'Honest installation guidance for web app, Android APK, and iOS browser behavior.',
  'Content that explains lawful use, supported platforms, and troubleshooting help.',
];

export default function RecommendedApps() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            DownloadDash Guides
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            This page explains how DownloadDash works, what kinds of links it supports, how to install the app experience on different devices, and the rules users should follow before saving media.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {resourceCards.map((card, index) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-5">
                {card.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{card.title}</h2>
              <p className="text-gray-400 leading-7">{card.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-8 md:p-10 mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-5">What We Are Improving For Site Quality</h2>
          <p className="text-gray-400 max-w-3xl leading-7 mb-6">
            DownloadDash is being shaped into a clearer publisher-quality utility site rather than a thin one-screen downloader. That means every key screen should provide user help, guidance, or policy context instead of acting as a blank shell around ad placements.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {qualityChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-purple-500/10 bg-white/[0.03] p-4">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-8 md:p-10"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Need Help Or Want To Report Something?</h2>
          <p className="text-gray-400 max-w-3xl leading-7 mb-6">
            If a link fails, if you need help understanding installation on your device, or if you are a rights holder with a concern, use the contact page. Clear support and compliance channels are part of how we keep DownloadDash useful and responsible.
          </p>
          <Link
            to={createPageUrl('Contact')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Open Contact Page
            <ExternalLink className="h-4 w-4" />
          </Link>
        </motion.section>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {[
            ['HowDownloadDashWorks', 'Read How DownloadDash Works'],
            ['SupportedPlatforms', 'See Supported Platforms'],
            ['Troubleshooting', 'Open Troubleshooting Guide'],
            ['ResponsibleUse', 'Review Responsible Use'],
          ].map(([page, label]) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-5 text-white hover:border-purple-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
