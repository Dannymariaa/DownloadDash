import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function FacebookDownloaderLP() {
  useSEO({
    title: 'Facebook Video Downloader - Save FB Videos HD | DownloadDash',
    description: 'Download Facebook videos in HD quality without watermark. Save videos from feed, stories, and live streams. Fast and free.',
    keywords: 'Facebook downloader, download Facebook videos, FB video saver, Facebook video download, Facebook live video downloader',
    canonical: `${SEO_BASE_URL}/facebook-downloader`,
    ogTitle: 'Facebook Video Downloader - Save FB Videos HD',
    ogDescription: 'Download Facebook videos in HD quality for free. Instant and secure.',
    structuredData: generateStructuredData.downloadPage('Facebook Downloader', 'Facebook'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Facebook Downloader', url: '/facebook-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'Any Video Type', description: 'Download posts, reels, live streams, stories' },
    { icon: Download, title: 'HD Quality', description: 'Save in highest quality available' },
    { icon: Shield, title: 'Fast & Secure', description: 'Download in seconds, completely safe' },
    { icon: Smartphone, title: 'Multi-Device', description: 'Works on desktop, mobile, tablet' },
  ];

  const faqItems = [
    { question: 'Can I download private Facebook videos?', answer: 'Only public videos can be downloaded. Private videos are protected by Facebook\'s privacy settings.' },
    { question: 'What formats does the downloader support?', answer: 'We support MP4, WebM, and other common video formats. Choose your preferred format at download time.' },
    { question: 'Can I download Facebook live videos?', answer: 'Yes! You can download Facebook live videos after they\'re finished streaming. Just use the replay link.' },
    { question: 'Is downloading Facebook videos legal?', answer: 'Downloading for personal use is legal in most countries. Respect copyright and creator rights.' },
    { question: 'Do I need a Facebook account?', answer: 'No account required to download public Facebook videos.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-blue-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download Facebook <span className="text-blue-400">Videos HD</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Save Facebook videos in HD quality without watermark. Download posts, reels, stories, and live streams instantly. No sign-up needed.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Choose Our Facebook Downloader?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-blue-500/20 rounded-lg p-6 hover:border-blue-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download Facebook Videos</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Get Video URL', desc: 'Right-click on Facebook video and copy link' },
              { step: 2, title: 'Paste Link', desc: 'Paste the URL into our Facebook downloader' },
              { step: 3, title: 'Download', desc: 'Choose quality and download to your device' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-blue-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600/20 border border-blue-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-blue-400">{item.step}</span>
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
                className="bg-white/5 border border-blue-500/20 rounded-lg p-6 cursor-pointer hover:border-blue-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-blue-400 group-open:rotate-180 transition-transform" />
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
              { name: 'TikTok', path: '/tiktok-downloader', color: 'cyan' },
              { name: 'Pinterest', path: '/pinterest-downloader', color: 'red' },
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-blue-600/10 border border-blue-500/30 hover:border-blue-500 rounded-lg text-blue-300 hover:text-blue-200 transition-all font-semibold`}
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
