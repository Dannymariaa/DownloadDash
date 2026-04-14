import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

// SD / Photo download: skip button appears after 5 seconds, auto-completes at 20s
const SKIP_DELAY = 5;
const AUTO_COMPLETE = 20;

export default function SkippableAdModal({ isOpen, onComplete, downloadLabel = "SD Video" }) {
  const [skipLeft, setSkipLeft] = useState(SKIP_DELAY);
  const [autoLeft, setAutoLeft] = useState(AUTO_COMPLETE);
  const [canSkip, setCanSkip] = useState(false);
  const { isMobileApp } = useAdPlatform();

  useEffect(() => {
    if (!isOpen) {
      setSkipLeft(SKIP_DELAY);
      setAutoLeft(AUTO_COMPLETE);
      setCanSkip(false);
      return;
    }

    const t = setInterval(() => {
      setSkipLeft(prev => {
        if (prev <= 1) { setCanSkip(true); return 0; }
        return prev - 1;
      });
      setAutoLeft(prev => {
        if (prev <= 1) { clearInterval(t); onComplete?.(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/99 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">AD</span>
              <span className="text-gray-400 text-sm">{downloadLabel} download starting soon…</span>
            </div>

            {/* Ad Container */}
            <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/20 flex items-center justify-center relative overflow-hidden mb-4">
              {isMobileApp ? (
                <div className="flex flex-col items-center text-center p-8">
                  <div className="text-5xl mb-3">📱</div>
                  <p className="text-gray-400">Loading AdMob Interstitial...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="text-6xl mb-4"
                  >
                    💫
                  </motion.div>
                  <p className="text-white text-xl font-bold">Sponsored Content</p>
                  <p className="text-gray-400 text-sm mt-2">Your download starts in {autoLeft}s</p>
                  {/* ↓ Replace with real AdSense ins tag */}
                  <div className="mt-5 w-full max-w-xs h-14 bg-gray-800/70 rounded-xl border border-purple-500/20 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">AdSense Interstitial Space</span>
                  </div>
                </div>
              )}

              {/* Auto-countdown top-left */}
              <div className="absolute top-3 left-3 bg-black/70 rounded-lg px-2.5 py-1">
                <span className="text-white text-xs font-mono">{autoLeft}s</span>
              </div>
            </div>

            {/* Skip button */}
            <div className="flex justify-between items-center">
              <p className="text-gray-600 text-xs">Auto-downloading in {autoLeft}s</p>
              {canSkip ? (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={onComplete}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Skip Ad <X className="h-4 w-4" />
                </motion.button>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-2">
                  <span className="text-gray-400 text-sm">Skip in {skipLeft}s</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}