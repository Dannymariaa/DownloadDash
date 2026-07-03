import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Download, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';
import AdBanner from '@/components/AdBanner';

export default function PinterestDownloaderLP() {
  useSEO({
    title: 'Pinterest Downloader - Save Pins & Videos | DownloadDash',
    description: 'Download Pinterest pins, photos, and videos without watermark. Save high-quality images for your collection instantly.',
    keywords: 'Pinterest downloader, download Pinterest images, Pinterest photo saver, Pinterest video downloader, save Pinterest pins',
    canonical: `${SEO_BASE_URL}/pinterest-downloader`,
    ogTitle: 'Pinterest Downloader - Save Pins & Videos',
    ogDescription: 'Download Pinterest images and videos in high quality for free.',
    structuredData: generateStructuredData.downloadPage('Pinterest Downloader', 'Pinterest'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Pinterest Downloader', url: '/pinterest-downloader' },
    ]),
  });

  const features = [
    { icon: Zap, title: 'High Resolution', description: 'Save Pinterest pins in original quality' },
    { icon: Download, title: 'Bulk Download', description: 'Save multiple pins easily' },
    { icon: Shield, title: 'Privacy Safe', description: 'No account linking required' },
    { icon: Smartphone, title: 'Easy to Use', description: 'Simple, fast, and intuitive interface' },
  ];

  const faqItems = [
    { question: 'Can I download Pinterest videos?', answer: 'Yes! Our Pinterest downloader supports both images and videos from Pinterest.' },
    { question: 'What image quality will I get?', answer: 'We save Pinterest pins in the highest quality available, usually original resolution.' },
    { question: 'Can I download private Pinterest boards?', answer: 'We can only download from public pins. Private board content is protected by Pinterest.' },
    { question: 'Is it legal to download Pinterest images?', answer: 'Downloading for personal use is legal. However, respect copyright and creator rights.' },
    { question: 'Do I need a Pinterest account?', answer: 'No account needed! Download from any public Pinterest pin.' },
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
            Download Pinterest <span className="text-red-400">Pins & Images</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Save high-quality Pinterest pins, photos, and videos instantly. No watermark, no account required. Build your visual collection today.
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Use Our Pinterest Downloader?</h2>
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">How to Download Pinterest Pins</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Get Pin Link', desc: 'Find the Pinterest pin and copy its URL' },
              { step: 2, title: 'Paste URL', desc: 'Paste the link into our Pinterest downloader' },
              { step: 3, title: 'Download', desc: 'Click download and save the high-quality image' },
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
              { name: 'YouTube', path: '/youtube-downloader', color: 'red' },
              { name: 'Instagram', path: '/instagram-downloader', color: 'pink' },
              { name: 'TikTok', path: '/tiktok-downloader', color: 'cyan' },
              { name: 'Facebook', path: '/facebook-downloader', color: 'blue' },
              { name: 'Reddit', path: '/reddit-downloader', color: 'orange' },
              { name: 'X (Twitter)', path: '/x-downloader', color: 'gray' },
            ].map((platform) => (
              <Link
                key={platform.path}
                to={platform.path}
                className={`p-4 bg-red-600/10 border border-red-500/30 hover:border-red-500 rounded-lg text-red-300 hover:text-red-200 transition-all font-semibold`}
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
