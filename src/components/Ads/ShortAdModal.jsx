import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X } from 'lucide-react';
import { useAdPlatform } from './useAdPlatform';

export default function ShortAdModal({ isOpen, onComplete, onCancel, downloadLabel = 'Audio / MP3', duration = 5 }) {
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
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(t);
        setReady(true);
        return 0;
      }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [isOpen, duration]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-gray-900 rounded-3xl border border-green-500/30 p-7 text-center shadow-xl shadow-green-500/10">
            <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">QUICK AD</span>

            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-20 h-20 mx-auto mt-5 mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
            >
              <Music className="h-10 w-10 text-white" />
            </motion.div>

            <p className="text-white text-lg font-bold mb-1">{downloadLabel}</p>
            <p className="text-gray-400 text-sm mb-5">Starting in {timeLeft}s...</p>

            <div className="flex justify-center mb-4">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" stroke="#1f2937" strokeWidth="5" fill="none" />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="#22c55e"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={138}
                  animate={{ strokeDashoffset: 138 - (138 * (duration - timeLeft) / duration) }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '28px 28px' }}
                />
                <text x="28" y="33" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{timeLeft}</text>
              </svg>
            </div>

            {isMobileApp ? (
              <p className="text-gray-600 text-xs">AdMob Short Ad</p>
            ) : (
              <div className="h-10 bg-gray-800 rounded-xl border border-green-500/20 flex items-center justify-center">
                <span className="text-gray-600 text-xs">AdSense Short Ad Space</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm flex justify-between items-center mt-4 gap-4">
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{downloadLabel}</p>
              <p className="text-gray-400 text-xs">
                {ready ? 'Claim your reward to start download.' : `Waiting ${timeLeft}s...`}
              </p>
            </div>
            <div className="flex gap-3">
              {ready ? (
                <motion.button
                  initial={{ scale: 0.96 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={onComplete}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-green-500/20"
                >
                  Claim Reward
                </motion.button>
              ) : null}
              <motion.button
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={onCancel}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
