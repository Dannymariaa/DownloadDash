import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoAdOverlay({ isOpen, onClose, onComplete }) {
  const [countdown, setCountdown] = useState(5);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!isOpen) return undefined;
    setCountdown(5);
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [isOpen, countdown]);

  const handleClose = () => {
    onComplete?.();
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <section className="px-4 pt-6" aria-label="Video advertisement">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-gray-950 via-black to-purple-950/40"
      >
        <div className="flex items-center justify-between border-b border-purple-500/20 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-purple-300">
            <Film className="h-4 w-4" />
            Video Advertisement
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted((muted) => !muted)}
              className="h-8 w-8 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
              aria-label={isMuted ? 'Unmute video ad' : 'Mute video ad'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close video advertisement"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
          <div className="aspect-video overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-900/50 to-black">
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Film className="h-8 w-8 text-white" />
                </motion.div>
                <p className="text-lg font-semibold text-purple-200">Display Video Ad</p>
                <p className="mt-2 text-sm text-gray-500">Support DownloadDash</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-purple-500/20 bg-white/[0.03] p-4">
            <div>
              <div className="mb-3 inline-flex rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-300">
                AD
              </div>
              <p className="text-sm leading-6 text-gray-300">Inline sponsor message for DownloadDash.</p>
            </div>
            <Button onClick={handleClose} className="mt-4 h-10 w-full bg-purple-600 text-white hover:bg-purple-700">
              {countdown > 0 ? `Close (${countdown}s)` : 'Close'}
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
