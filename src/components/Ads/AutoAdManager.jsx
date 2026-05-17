import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Smartphone, X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

const ENABLE_WEB_ADS =
  String(import.meta.env.VITE_ENABLE_WEB_ADS || '').toLowerCase() === 'true';

const INTERVAL_MS = 3 * 60 * 1000;

export default function AutoAdManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobileApp } = useAdPlatform();
  const lastShownRef = useRef(Date.now());

  if (!isMobileApp && !ENABLE_WEB_ADS) {
    return null;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastShownRef.current >= INTERVAL_MS) {
        lastShownRef.current = Date.now();
        setIsOpen(true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/99 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">ADVERTISEMENT</span>
              <motion.button
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleClose}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </motion.button>
            </div>

            <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/20 flex items-center justify-center relative overflow-hidden mb-4">
              {isMobileApp ? (
                <div className="flex flex-col items-center text-center p-8">
                  <Smartphone className="h-12 w-12 mb-3 text-gray-300" />
                  <p className="text-gray-400">AdMob Full-Screen Ad</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-center p-8">
                  <motion.div
                    animate={{ y: [0, -12, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="mb-4"
                  >
                    <Sparkles className="h-14 w-14 text-purple-300" />
                  </motion.div>
                  <p className="text-white text-2xl font-bold">Sponsored</p>
                  <p className="text-gray-400 mt-2 text-sm">Keeping DownloadDash free for everyone</p>
                  <div className="mt-6 w-72 h-16 bg-gray-800 rounded-xl border border-purple-500/20 flex items-center justify-center">
                    <span className="text-gray-600 text-sm">AdSense Full-Screen Space</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
