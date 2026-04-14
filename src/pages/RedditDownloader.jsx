import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ExternalLink, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdBanner from '@/components/AdBanner';

export default function RecommendedApps() {
  // This array will be populated with your future apps
  const recommendedApps = [
    // Example structure for when you add apps:
    // {
    //   name: 'App Name',
    //   description: 'App description',
    //   icon: '🚀',
    //   gradient: 'from-blue-500 to-purple-500',
    //   link: 'https://yourapp.com',
    //   rating: 4.8,
    //   downloads: '100K+'
    // }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center"
          >
            <Sparkles className="h-10 w-10 text-white" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Recommended Apps
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Discover more amazing apps from our collection
          </p>
        </motion.div>

        {recommendedApps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-20"
          >
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-12 border border-purple-500/20 max-w-2xl mx-auto">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-6xl mb-6"
              >
                🚀
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Coming Soon!
              </h2>
              <p className="text-gray-400 mb-6">
                We're working on more amazing apps for you. Check back soon to discover our new creations!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {['Games', 'Utilities', 'Productivity', 'Entertainment'].map((tag, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="px-4 py-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedApps.map((app, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${app.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {app.icon}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{app.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {app.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {app.downloads}
                  </span>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                  onClick={() => window.open(app.link, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Get App
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500">
            Want to suggest an app feature? 
            <a href="mailto:contact@downloaddash.com" className="text-purple-400 hover:text-purple-300 ml-1">
              Contact us
            </a>
          </p>
        </motion.div>
      </div>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}