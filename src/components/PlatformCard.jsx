import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Download } from 'lucide-react';
import { getPlatformIcon } from './PlatformIcons';

const platformConfig = {
  tiktok:    { gradient: 'from-pink-500 via-purple-500 to-cyan-500',    features: ['Videos', 'Stories', 'Public Links'] },
  instagram: { gradient: 'from-purple-600 via-pink-500 to-orange-400', features: ['Reels', 'Stories', 'Posts', 'IGTV'] },
  facebook:  { gradient: 'from-blue-600 to-blue-400',                   features: ['Videos', 'Stories', 'Reels'] },
  twitter:   { gradient: 'from-gray-800 to-gray-600',                   features: ['Videos', 'GIFs', 'Images'] },
  whatsapp:  { gradient: 'from-green-600 to-green-400',                 features: ['Status', 'Videos', 'Images', 'Local Save'] },
  telegram:  { gradient: 'from-blue-500 to-cyan-400',                   features: ['Videos', 'Files', 'Media'] },
  snapchat:  { gradient: 'from-yellow-400 to-yellow-500',               features: ['Stories', 'Spotlights'] },
  youtube:   { gradient: 'from-red-600 to-red-500',                     features: ['Videos', 'Shorts', 'Audio'] },
  pinterest: { gradient: 'from-red-500 to-pink-500',                    features: ['Images', 'Videos', 'Pins'] },
  reddit:    { gradient: 'from-orange-600 to-orange-400',               features: ['Videos', 'GIFs', 'Images'] },
};

export default function PlatformCard({ platform, name, description }) {
  const config = platformConfig[platform] || platformConfig.tiktok;
  const pageName = name === 'WhatsAppStatus' ? 'WhatsAppStatusSaver' : `${name.replace(/\s/g, '')}Downloader`;

  return (
    <Link to={createPageUrl(pageName)}>
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className="group relative bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-500 overflow-hidden cursor-pointer"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl group-hover:opacity-100 opacity-0 transition-opacity duration-500" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              className="w-14 h-14 rounded-xl overflow-hidden shadow-lg flex items-center justify-center"
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            >
              {getPlatformIcon(platform, 56)}
            </motion.div>
            <motion.div initial={{ x: 0 }} whileHover={{ x: 5 }} className="text-purple-400 group-hover:text-purple-300">
              <ArrowRight className="h-5 w-5" />
            </motion.div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">{name}</h3>
          <p className="text-gray-400 text-sm mb-4">{description}</p>

          <div className="flex flex-wrap gap-2">
            {config.features.map((f, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">{f}</span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-green-400 text-sm">
            <Download className="h-4 w-4" />
            <span>Open Tool</span>
          </div>
        </div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"
          initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }}
        />
      </motion.div>
    </Link>
  );
}
