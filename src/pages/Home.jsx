import React from 'react';
import { motion } from 'framer-motion';
import { Download, Zap, Shield, Globe, Star, ArrowDown, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdBanner from '@/components/AdBanner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { YouTubeIcon } from '@/components/PlatformIcons';

const stats = [
  { value: '10M+', label: 'Downloads' },
  { value: '500K+', label: 'Users' },
  { value: '4.9', label: 'Rating' },
  { value: '24/7', label: 'Support' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm mb-8"
            >
              <Zap className="h-4 w-4" />
              <span>The #1 YouTube Downloader of 2026</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Download
              </span>
              <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                Dash
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Download YouTube videos, shorts & music in HD quality.
              <span className="text-purple-400"> No watermarks. Free forever.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 text-lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Start Downloading
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 rounded-xl text-lg"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Download APK
                </Button>
              </motion.div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </motion.div>
      </section>

      <div className="px-4">
        <AdBanner position="middle" size="medium" />
      </div>

      {/* YouTube CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              YouTube Downloader
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Download YouTube videos, shorts & audio in HD quality — no watermark, free forever.
            </p>
            <Link to={createPageUrl('YouTubeDownloader')}>
              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-5 bg-gradient-to-br from-gray-900 to-black border border-red-500/40 hover:border-red-500/80 rounded-3xl px-10 py-7 shadow-xl shadow-red-500/10 transition-all duration-300 cursor-pointer"
              >
                <YouTubeIcon size={64} />
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">YouTube</p>
                  <p className="text-gray-400 text-sm mt-1">Videos · Shorts · Audio MP3</p>
                  <span className="inline-block mt-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">Start Downloading →</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Why Choose DownloadDash?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Zap className="h-8 w-8" />, 
                title: 'Lightning Fast', 
                desc: 'Download videos in seconds with our optimized servers',
                gradient: 'from-yellow-500 to-orange-500'
              },
              { 
                icon: <Shield className="h-8 w-8" />, 
                title: 'Secure & Private', 
                desc: 'Your data is never stored or shared with third parties',
                gradient: 'from-green-500 to-emerald-500'
              },
              { 
                icon: <Globe className="h-8 w-8" />, 
                title: 'Works Everywhere', 
                desc: 'Use on any device - mobile, tablet, or desktop',
                gradient: 'from-blue-500 to-cyan-500'
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-purple-900/50 to-black rounded-3xl p-8 md:p-12 border border-purple-500/30 overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-600/30 rounded-full blur-[80px]" />
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Download the App
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Get DownloadDash on your device for the best experience. Available as APK - coming soon to Play Store & App Store!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download APK
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 rounded-xl"
                  >
                    <Star className="mr-2 h-5 w-5" />
                    Coming to Play Store
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}