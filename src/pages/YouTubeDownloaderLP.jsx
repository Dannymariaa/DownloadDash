import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function YouTubeDownloaderLP() {
  useSEO({
    title: 'YouTube Downloader - Download Videos HD 1080p | DownloadDash',
    description: 'Download YouTube videos in HD quality without watermark. Fast, free, and no sign-up required. Save videos in MP4, WebM, and audio formats.',
    keywords: 'YouTube downloader, download YouTube videos, YouTube video saver, HD YouTube downloader, YouTube mp4 downloader, free YouTube downloader',
    canonical: `${SEO_BASE_URL}/youtube-downloader`,
    ogTitle: 'YouTube Downloader - Download Videos HD 1080p',
    ogDescription: 'Download YouTube videos in HD quality for free. No watermark, no sign-up, instant download.',
    structuredData: generateStructuredData.downloadPage('YouTube Downloader', 'YouTube'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'YouTube Downloader', url: '/youtube-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'Lightning Fast', description: 'Download any YouTube video in seconds' },
    { icon: Download, title: 'Multiple Formats', description: 'Save as MP4, WebM, MP3, or audio only' },
    { icon: Shield, title: '100% Safe', description: 'No malware, no tracking, completely secure' },
    { icon: Smartphone, title: 'Mobile Friendly', description: 'Works on all devices and browsers' },
  ];

  const faqItems = [
    { question: 'Is it legal to download YouTube videos?', answer: 'Downloading content for personal use from YouTube is legal in most countries. However, ensure you have the right to download the content and respect copyright laws.' },
    { question: 'Do you need an account to download?', answer: 'No! DownloadDash YouTube downloader works completely without requiring account creation or sign-up.' },
    { question: 'What video formats are supported?', answer: 'We support MP4, WebM, FLV, and various other formats. You can also download audio-only files in MP3 or M4A formats.' },
    { question: 'How long does download take?', answer: 'Most videos download in seconds. The time depends on video length and your internet connection speed.' },
    { question: 'Can I download playlists?', answer: 'Our YouTube downloader currently supports individual video downloads. For playlists, download videos one by one.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-red-900/10 to-black">
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Download YouTube Videos <span className="text-red-400">in HD</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Fast, free, and without watermark. Save YouTube videos in MP4, WebM, or audio format instantly. No sign-up required.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold transition-all">
            Start Downloading <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <AdBanner position="top" size="large" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Choose DownloadDash?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-red-500/20 rounded-lg p-6 hover:border-red-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-red-400 mb-4" />
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download YouTube Videos</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy Video URL', desc: 'Paste the YouTube video link into our downloader' },
              { step: 2, title: 'Select Format', desc: 'Choose your preferred video or audio format' },
              { step: 3, title: 'Download', desc: 'Click download and save the video to your device' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white/5 border border-red-500/20 rounded-lg p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-red-600/20 border border-red-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-red-400">{item.step}</span>
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
                className="bg-white/5 border border-red-500/20 rounded-lg p-6 cursor-pointer hover:border-red-500/50 transition-all group"
              >
                <summary className="font-semibold text-white flex items-center justify-between">
                  {item.question}
                  <CheckCircle className="w-5 h-5 text-red-400 group-open:rotate-180 transition-transform" />
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
              { name: 'Instagram', path: '/instagram-downloader', color: 'pink' },
              { name: 'TikTok', path: '/tiktok-downloader', color: 'cyan' },
              { name: 'Facebook', path: '/facebook-downloader', color: 'blue' },
              { name: 'Pinterest', path: '/pinterest-downloader', color: 'red' },
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-${platform.color}-600/10 border border-${platform.color}-500/30 hover:border-${platform.color}-500 rounded-lg text-${platform.color}-300 hover:text-${platform.color}-200 transition-all font-semibold`}
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
