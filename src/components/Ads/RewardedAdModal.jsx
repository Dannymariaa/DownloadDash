import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Download, Film, Smartphone, Trophy, X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

const AD_DURATION = 30;

export default function RewardedAdModal({ isOpen, onComplete, onCancel, downloadLabel = 'HD Video' }) {
  const [timeLeft, setTimeLeft] = useState(AD_DURATION);
  const [ready, setReady] = useState(false);
  const { isMobileApp } = useAdPlatform();

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(AD_DURATION);
      setReady(false);
      return;
    }
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(t);
        setReady(true);
        return 0;
      }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [isOpen]);

  const progress = ((AD_DURATION - timeLeft) / AD_DURATION) * 100;

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
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">AD</span>
              <span className="text-purple-300 text-sm font-medium flex-1 text-center sm:text-left flex items-center justify-center gap-1.5">
                <Trophy className="h-4 w-4" /> Earn {downloadLabel} - Watch Full Ad
              </span>
              <motion.button
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={onCancel}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </motion.button>
            </div>

            <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/30 flex items-center justify-center relative overflow-hidden mb-4">
              {isMobileApp ? (
                <div className="flex flex-col items-center text-center p-8">
                  <Smartphone className="h-12 w-12 mb-3 text-gray-300" />
                  <p className="text-gray-400">Loading AdMob Rewarded Ad...</p>
                  <p className="text-gray-600 text-sm mt-1">Native ad rendering</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4"
                  >
                    <Film className="h-10 w-10 text-white" />
                  </motion.div>
                  <p className="text-white text-xl font-bold">Sponsored Content</p>
                  <p className="text-gray-400 text-sm mt-2">Watch to unlock your {downloadLabel}</p>
                  <div className="mt-5 w-full max-w-xs h-14 bg-gray-800/70 rounded-xl border border-purple-500/20 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">AdSense Rewarded Space</span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                {ready ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Ad complete. Download is ready.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {timeLeft}s - Must watch full ad
                  </span>
                )}
              </p>
              {ready ? (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={onComplete}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-green-500/25"
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> Claim Reward
                  </span>
                </motion.button>
              ) : (
                <span className="text-gray-600 text-xs border border-gray-700 rounded-lg px-3 py-1.5">
                  No skip - {timeLeft}s left
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
