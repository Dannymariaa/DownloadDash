import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadAdsterraScript, ADSTERRA_UNITS } from '@/config/adsterraConfig';

/**
 * HD Video Unlock Ad Modal
 * Shows native Adsterra banner (zone 30079457) to unlock HD video downloads
 */
export default function HDVideoAdModal({
  isOpen,
  onClose,
  onComplete,
  videoTitle = 'HD Video',
  countdownSeconds = 30,
  rewardLabel = 'Claim Award',
}) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const containerId = 'adsterra-native-banner-hd-unlock';

  // Load native banner ad on mount
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(countdownSeconds);

    const timer = setTimeout(() => {
      loadAdsterraScript(
        containerId,
        ADSTERRA_UNITS.nativeBanner.scriptSrc
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, countdownSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isOpen, countdown]);

  const handleComplete = () => {
    onComplete?.();
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="w-full max-w-2xl mx-4 overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-gray-950 via-black to-purple-950/40 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/20 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Unlock {videoTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">Watch the short sponsor panel, then claim your award to start the download</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Native Ad Container */}
          <div
            id={containerId}
            className="mb-6 flex items-center justify-center rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-purple-900/5 to-purple-900/10 p-4 min-h-[200px]"
          >
            {/* Adsterra native banner script will inject content here */}
          </div>

          {/* Info Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 text-xs">✓</span>
              </div>
              <p className="text-gray-300">Watch a quick advertisement</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 text-xs">✓</span>
              </div>
              <p className="text-gray-300">Support DownloadDash</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 text-xs">✓</span>
              </div>
              <p className="text-gray-300">Start your selected DownloadDash download</p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleComplete}
            disabled={countdown > 0}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-base disabled:opacity-60"
          >
            {countdown > 0 ? `${videoTitle} in ${countdown}s` : rewardLabel}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-3">
            Ad-free downloads available with DownloadDash Pro
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
