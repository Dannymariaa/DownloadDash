import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function InstagramDownloaderLP() {
  useSEO({
    title: 'Instagram Downloader - Save Photos & Videos HD | DownloadDash',
    description: 'Download Instagram photos, videos, and reels without watermark in HD quality. Save Stories, Posts, and IGTV content instantly.',
    keywords: 'Instagram downloader, download Instagram videos, Instagram photo downloader, Instagram reels downloader, Instagram story saver',
    canonical: `${SEO_BASE_URL}/instagram-downloader`,
    ogTitle: 'Instagram Downloader - Save Photos & Videos HD',
    ogDescription: 'Download Instagram photos, videos, and reels in HD. No watermark, instant download.',
    structuredData: generateStructuredData.downloadPage('Instagram Downloader', 'Instagram'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Instagram Downloader', url: '/instagram-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'Instant Download', description: 'Download Instagram photos and videos in seconds' },
    { icon: Download, title: 'All Content Types', description: 'Photos, Videos, Reels, Stories, IGTV' },
    { icon: Shield, title: '100% Safe', description: 'No malware, no tracking, completely secure' },
    { icon: Smartphone, title: 'HD Quality', description: 'Download in highest available quality' },
  ];

  const faqItems = [
    { question: 'Can I download private Instagram accounts?', answer: 'No, we can only download from public accounts. Instagram\'s privacy settings prevent downloading from private accounts.' },
    { question: 'Do Instagram stories disappear after download?', answer: 'No! Downloaded stories are saved permanently on your device. Instagram won\'t know you downloaded them.' },
    { question: 'Can I download carousel posts?', answer: 'Yes! Our downloader can save all images and videos from carousel posts in a single download.' },
    { question: 'Is downloading Instagram content legal?', answer: 'Downloading content for personal use is generally legal. However, respect copyright and creator rights.' },
    { question: 'Do I need an Instagram account?', answer: 'No account needed! You can download from any public Instagram profile.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-pink-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download Instagram <span className="text-pink-400">Photos & Videos</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Save Instagram photos, videos, reels, stories, and IGTV content in HD quality. No watermark, instant download, no account required.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Choose Our Instagram Downloader?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-pink-500/20 rounded-lg p-6 hover:border-pink-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-pink-400 mb-4" />
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download Instagram Content</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy Link', desc: 'Get the link to the Instagram photo, video, or story' },
              { step: 2, title: 'Paste URL', desc: 'Paste the link into our Instagram downloader' },
              { step: 3, title: 'Download', desc: 'Click download and save to your device instantly' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-pink-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-pink-600/20 border border-pink-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-pink-400">{item.step}</span>
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
                className="bg-white/5 border border-pink-500/20 rounded-lg p-6 cursor-pointer hover:border-pink-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-pink-400 group-open:rotate-180 transition-transform" />
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
              { name: 'TikTok', path: '/tiktok-downloader', color: 'cyan' },
              { name: 'Facebook', path: '/facebook-downloader', color: 'blue' },
              { name: 'Pinterest', path: '/pinterest-downloader', color: 'red' },
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-pink-600/10 border border-pink-500/30 hover:border-pink-500 rounded-lg text-pink-300 hover:text-pink-200 transition-all font-semibold`}
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
