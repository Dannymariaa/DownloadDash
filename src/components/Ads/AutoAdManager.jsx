import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

// Auto-play interstitial every 3 minutes — user can cancel after 5s
const INTERVAL_MS = 3 * 60 * 1000;
const SKIP_DELAY = 5;

export default function AutoAdManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [skipLeft, setSkipLeft] = useState(SKIP_DELAY);
  const [canCancel, setCanCancel] = useState(false);
  const { isMobileApp } = useAdPlatform();
  const lastShownRef = useRef(Date.now());

  // Periodic trigger
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastShownRef.current >= INTERVAL_MS) {
        lastShownRef.current = Date.now();
        setIsOpen(true);
        setSkipLeft(SKIP_DELAY);
        setCanCancel(false);
      }
    }, 15000); // check every 15s
    return () => clearInterval(interval);
  }, []);

  // Countdown when open
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setSkipLeft(prev => {
      if (prev <= 1) { setCanCancel(true); clearInterval(t); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [isOpen]);

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
              {canCancel ? (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleClose}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </motion.button>
              ) : (
                <span className="text-gray-500 text-sm">Can cancel in {skipLeft}s</span>
              )}
            </div>

            <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/20 flex items-center justify-center relative overflow-hidden mb-4">
              {isMobileApp ? (
                <div className="flex flex-col items-center text-center p-8">
                  <div className="text-5xl mb-3">📱</div>
                  <p className="text-gray-400">AdMob Full-Screen Ad</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-center p-8">
                  <motion.div
                    animate={{ y: [0, -12, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="text-6xl mb-4"
                  >
                    🌟
                  </motion.div>
                  <p className="text-white text-2xl font-bold">Sponsored</p>
                  <p className="text-gray-400 mt-2 text-sm">Keeping DownloadDash free for everyone</p>
                  {/* ↓ Replace with your real AdSense ins tag */}
                  <div className="mt-6 w-72 h-16 bg-gray-800 rounded-xl border border-purple-500/20 flex items-center justify-center">
                    <span className="text-gray-600 text-sm">AdSense Full-Screen Space</span>
                  </div>
                </div>
              )}
            </div>

            {!canCancel && (
              <div className="flex justify-center">
                <div className="flex gap-1.5">
                  {Array.from({ length: SKIP_DELAY }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < (SKIP_DELAY - skipLeft) ? 'bg-purple-500' : 'bg-gray-700'}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}