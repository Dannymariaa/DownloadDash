import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function XDownloaderLP() {
  useSEO({
    title: 'X (Twitter) Video Downloader - Save Videos & Images | DownloadDash',
    description: 'Download X (Twitter) videos, images, and GIFs without watermark. Fast, free, and secure. Save your favorite posts instantly.',
    keywords: 'X downloader, Twitter downloader, download X videos, Twitter video saver, save tweets, X video download',
    canonical: `${SEO_BASE_URL}/x-downloader`,
    ogTitle: 'X (Twitter) Video Downloader - Save Videos & Images',
    ogDescription: 'Download X videos and images instantly. Free and secure.',
    structuredData: generateStructuredData.downloadPage('X Downloader', 'X'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'X Downloader', url: '/x-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'Video & Images', description: 'Download X videos, images, and GIFs' },
    { icon: Download, title: 'Original Quality', description: 'Save in highest quality available' },
    { icon: Shield, title: 'Super Fast', description: 'Download in under 3 seconds' },
    { icon: Smartphone, title: 'Any Device', description: 'Desktop, mobile, tablet support' },
  ];

  const faqItems = [
    { question: 'Can I download X (Twitter) videos?', answer: 'Yes! Download videos, images, and GIFs from any public X (Twitter) post.' },
    { question: 'Can I download protected tweets?', answer: 'Only public tweets can be downloaded. Protected accounts are private by default.' },
    { question: 'What formats are available?', answer: 'We support MP4 for videos and PNG/JPG for images. Download in your preferred format.' },
    { question: 'Is it legal to download X content?', answer: 'Downloading for personal use is legal. Respect copyright and creator rights.' },
    { question: 'Do I need an X account?', answer: 'No! Download from any public X post without an account.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download X <span className="text-gray-300">(Twitter) Videos</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Save X (Twitter) videos, images, and GIFs instantly. Download your favorite posts without watermark. No account required, completely free.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Use Our X Downloader?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-gray-500/20 rounded-lg p-6 hover:border-gray-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-gray-300 mb-4" />
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download X Videos</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy Tweet Link', desc: 'Click on the X tweet and copy the URL' },
              { step: 2, title: 'Paste URL', desc: 'Paste the link into our X downloader' },
              { step: 3, title: 'Download', desc: 'Click download and save instantly' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-gray-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-700/20 border border-gray-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-gray-300">{item.step}</span>
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
                className="bg-white/5 border border-gray-500/20 rounded-lg p-6 cursor-pointer hover:border-gray-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-gray-300 group-open:rotate-180 transition-transform" />
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
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-gray-700/10 border border-gray-500/30 hover:border-gray-500 rounded-lg text-gray-300 hover:text-gray-200 transition-all font-semibold`}
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
