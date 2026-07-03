import React from 'react';
import { motion } from 'framer-motion';
import { useAdPlatform } from './Ads/useAdPlatform';

/**
 * Smart Ad Banner - initializes the web ad provider and leaves stable space in native shells.
 *
 * To activate native mode in Capacitor, add:
 *   localStorage.setItem('NATIVE_APP', 'true');
 */
export default function AdBanner({ position = 'top', size = 'medium' }) {
  const { isMobileApp } = useAdPlatform();
  const containerId = `ad-banner-${position}-${size}`;

  if (isMobileApp) {
    const heights = { small: 50, medium: 50, large: 90, full: 250 };
    return <div style={{ height: heights[size] || 50 }} className="w-full shrink-0" aria-hidden="true" />;
  }

  const sizeStyles = {
    small: { minHeight: 60 },
    medium: { minHeight: 90 },
    large: { minHeight: 120 },
    full: { minHeight: 280 },
  };

  return (
    <motion.div
      id={containerId}
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 via-black/40 to-purple-900/20 flex items-center justify-center"
      style={sizeStyles[size]}
      aria-label="Advertisement space"
    >
      <p className="text-purple-300/60 text-xs font-medium">Advertisement</p>
    </motion.div>
  );
}
