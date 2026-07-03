import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function RedditDownloaderLP() {
  useSEO({
    title: 'Reddit Video Downloader - Save Posts & Videos | DownloadDash',
    description: 'Download Reddit videos, images, and GIFs without watermark. Save content from your favorite subreddits in HD quality.',
    keywords: 'Reddit downloader, download Reddit videos, Reddit video saver, Reddit image downloader, save Reddit posts',
    canonical: `${SEO_BASE_URL}/reddit-downloader`,
    ogTitle: 'Reddit Video Downloader - Save Posts & Videos',
    ogDescription: 'Download Reddit videos, images, and GIFs instantly. Free and fast.',
    structuredData: generateStructuredData.downloadPage('Reddit Downloader', 'Reddit'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Reddit Downloader', url: '/reddit-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'All Content Types', description: 'Videos, GIFs, images, and albums' },
    { icon: Download, title: 'Instant Download', description: 'Save Reddit content in seconds' },
    { icon: Shield, title: 'No Account', description: 'Download without authentication' },
    { icon: Smartphone, title: 'Universal', description: 'Works on all devices and browsers' },
  ];

  const faqItems = [
    { question: 'Can I download Reddit videos?', answer: 'Yes! Our downloader supports Reddit videos, GIFs, images, and entire albums from public subreddits.' },
    { question: 'What about NSFW content?', answer: 'Our downloader handles NSFW content if you\'re logged into Reddit. Public non-NSFW content downloads without login.' },
    { question: 'Can I download private subreddits?', answer: 'Only public subreddit content can be downloaded. Private communities are protected.' },
    { question: 'Is it legal to download from Reddit?', answer: 'Downloading for personal use is legal. Respect copyright and creator rights when sharing.' },
    { question: 'Do I need a Reddit account?', answer: 'No account required for most content! Download public Reddit posts without authentication.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-orange-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download Reddit <span className="text-orange-400">Videos & Images</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Save Reddit videos, GIFs, and images instantly. Download from any public subreddit. No account required, completely free.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Use Our Reddit Downloader?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-orange-500/20 rounded-lg p-6 hover:border-orange-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-orange-400 mb-4" />
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download Reddit Content</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy Post URL', desc: 'Get the link to the Reddit post or comment' },
              { step: 2, title: 'Paste Link', desc: 'Paste the URL into our Reddit downloader' },
              { step: 3, title: 'Download', desc: 'Select format and download instantly' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-orange-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-600/20 border border-orange-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-orange-400">{item.step}</span>
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
                className="bg-white/5 border border-orange-500/20 rounded-lg p-6 cursor-pointer hover:border-orange-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-orange-400 group-open:rotate-180 transition-transform" />
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
              { name: 'Facebook', path: '/facebook-downloader', color: 'blue' },
              { name: 'Pinterest', path: '/pinterest-downloader', color: 'red' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-orange-600/10 border border-orange-500/30 hover:border-orange-500 rounded-lg text-orange-300 hover:text-orange-200 transition-all font-semibold`}
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
