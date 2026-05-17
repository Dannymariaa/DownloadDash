import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Smartphone, X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

export default function SkippableAdModal({ isOpen, onComplete, onCancel, downloadLabel = 'SD Video', duration = 7 }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [ready, setReady] = useState(false);
  const { isMobileApp } = useAdPlatform();

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(duration);
      setReady(false);
      return;
    }

    setTimeLeft(duration);
    setReady(false);

    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [isOpen, duration]);

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
              <span className="text-gray-400 text-sm">{downloadLabel} download starting soon...</span>
            </div>

            <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/20 flex items-center justify-center relative overflow-hidden mb-4">
              {isMobileApp ? (
                <div className="flex flex-col items-center text-center p-8">
                  <Smartphone className="h-12 w-12 mb-3 text-gray-300" />
                  <p className="text-gray-400">Loading AdMob Interstitial...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="mb-4"
                  >
                    <Sparkles className="h-14 w-14 text-purple-300" />
                  </motion.div>
                  <p className="text-white text-xl font-bold">Sponsored Content</p>
                  <p className="text-gray-400 text-sm mt-2">Your download starts in {timeLeft}s</p>
                  <div className="mt-5 w-full max-w-xs h-14 bg-gray-800/70 rounded-xl border border-purple-500/20 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">AdSense Interstitial Space</span>
                  </div>
                </div>
              )}

              <div className="absolute top-3 left-3 bg-black/70 rounded-lg px-2.5 py-1">
                <span className="text-white text-xs font-mono">{timeLeft}s</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 items-center">
              <div className="text-left">
                <p className="text-white font-semibold">{downloadLabel}</p>
                <p className="text-gray-400 text-xs">{ready ? 'Claim your reward to continue.' : `Waiting ${timeLeft}s...`}</p>
              </div>
              <div className="flex gap-3">
                {ready ? (
                  <motion.button
                    initial={{ scale: 0.96 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={onComplete}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Claim Reward
                  </motion.button>
                ) : null}
                <motion.button
                  initial={{ scale: 0.96 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={onCancel}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
