import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function TikTokDownloaderLP() {
  useSEO({
    title: 'TikTok Downloader - Save Videos Without Watermark HD | DownloadDash',
    description: 'Download TikTok videos without watermark in full HD quality. Fast, free, and secure. No sign-up required. Save TikTok content in seconds.',
    keywords: 'TikTok downloader, download TikTok videos, TikTok video saver, TikTok no watermark, TikTok mp4 download, free TikTok downloader',
    canonical: `${SEO_BASE_URL}/tiktok-downloader`,
    ogTitle: 'TikTok Downloader - Save Videos Without Watermark',
    ogDescription: 'Download TikTok videos without watermark in HD quality. Instant and free.',
    structuredData: generateStructuredData.downloadPage('TikTok Downloader', 'TikTok'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'TikTok Downloader', url: '/tiktok-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'No Watermark', description: 'Remove TikTok watermark automatically' },
    { icon: Download, title: 'HD Quality', description: 'Download in highest available quality' },
    { icon: Shield, title: 'Lightning Fast', description: 'Save videos in under 5 seconds' },
    { icon: Smartphone, title: 'Works Everywhere', description: 'Desktop, mobile, tablet - all devices' },
  ];

  const faqItems = [
    { question: 'Does the downloader remove watermarks?', answer: 'Yes! Our TikTok downloader automatically removes TikTok watermarks from videos, leaving clean, watermark-free videos.' },
    { question: 'Can I download private TikTok videos?', answer: 'Only public TikTok videos can be downloaded. Private videos are protected by TikTok\'s privacy settings.' },
    { question: 'Is it legal to download TikTok videos?', answer: 'Downloading for personal use is legal in most countries. Always respect creators\' rights and copyright policies.' },
    { question: 'How do I download TikTok videos?', answer: 'Copy the TikTok video link, paste it in our downloader, and click download. That\'s it!' },
    { question: 'Do I need a TikTok account?', answer: 'No account needed! Download from any public TikTok video using just the link.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-cyan-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download TikTok Videos <span className="text-cyan-400">Without Watermark</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Fast, free, and secure. Download TikTok videos in HD quality without watermark. No sign-up required. Save content instantly.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Use DownloadDash for TikTok?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-cyan-500/20 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AdBanner position="middle" size="medium" />

      {/* How It Works */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download TikTok Videos</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy TikTok Link', desc: 'Share the TikTok video and copy the link' },
              { step: 2, title: 'Paste in Downloader', desc: 'Paste the URL into our TikTok downloader' },
              { step: 3, title: 'Download', desc: 'Click download - video saves without watermark' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-cyan-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-cyan-600/20 border border-cyan-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-cyan-400">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdBanner position="middle" size="large" />

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <details
                key={idx}
                className="bg-white/5 border border-cyan-500/20 rounded-lg p-6 cursor-pointer hover:border-cyan-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-cyan-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-gray-400 mt-4 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <AdBanner position="bottom" size="medium" />

      {/* Internal Links */}
      <section className="px-4 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Download from Other Platforms</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'YouTube', path: '/youtube-downloader', color: 'red' },
              { name: 'Instagram', path: '/instagram-downloader', color: 'pink' },
              { name: 'Facebook', path: '/facebook-downloader', color: 'blue' },
              { name: 'Pinterest', path: '/pinterest-downloader', color: 'red' },
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-cyan-600/10 border border-cyan-500/30 hover:border-cyan-500 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all font-semibold`}
              >
                → Download {platform.name} Videos
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AdBanner position="bottom" size="large" />
    </div>
  );
}
