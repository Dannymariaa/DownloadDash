import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoAdOverlay({ isOpen, onClose, onComplete }) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanSkip(true);
    }
  }, [isOpen, countdown]);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setCanSkip(false);
    }
  }, [isOpen]);

  const handleSkip = () => {
    onComplete?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        >
          <div className="relative w-full max-w-2xl mx-4">
            <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-black rounded-2xl border border-purple-500/30 flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center"
                >
                  <span className="text-3xl">🎬</span>
                </motion.div>
                <p className="text-purple-300 text-lg font-medium">Video Advertisement</p>
                <p className="text-gray-500 text-sm mt-2">Support DownloadDash</p>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>

            <div className="absolute bottom-4 right-4">
              {canSkip ? (
                <Button
                  onClick={handleSkip}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                >
                  Skip Ad <X className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="bg-black/80 border border-purple-500/30 rounded-lg px-4 py-2">
                  <span className="text-purple-400 text-sm">Skip in {countdown}s</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4">
              <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg px-3 py-1">
                <span className="text-purple-300 text-xs">AD</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}