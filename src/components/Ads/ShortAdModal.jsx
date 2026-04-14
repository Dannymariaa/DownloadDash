import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdPlatform } from './useAdPlatform';

// Audio download: very short 3-second ad, auto-completes
const DURATION = 3;

export default function ShortAdModal({ isOpen, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const { isMobileApp } = useAdPlatform();

  useEffect(() => {
    if (!isOpen) { setTimeLeft(DURATION); return; }
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(t); onComplete?.(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-gray-900 rounded-3xl border border-green-500/30 p-7 text-center shadow-xl shadow-green-500/10">
            <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">QUICK AD</span>

            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-20 h-20 mx-auto mt-5 mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
            >
              <span className="text-4xl">🎵</span>
            </motion.div>

            <p className="text-white text-lg font-bold mb-1">Audio Download</p>
            <p className="text-gray-400 text-sm mb-5">Starting in {timeLeft}s…</p>

            {/* Progress ring */}
            <div className="flex justify-center mb-4">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" stroke="#1f2937" strokeWidth="5" fill="none"/>
                <motion.circle
                  cx="28" cy="28" r="22"
                  stroke="#22c55e" strokeWidth="5" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={138}
                  animate={{ strokeDashoffset: 138 - (138 * (DURATION - timeLeft) / DURATION) }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}