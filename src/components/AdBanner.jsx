import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdPlatform } from './Ads/useAdPlatform';

/**
 * Smart Ad Banner – shows AdSense on web, leaves space for AdMob on native app.
 * AdSense and AdMob will NEVER show at the same time.
 *
 * To activate AdSense: replace ca-pub-XXXXXXXXXXXXXXXX with your publisher ID
 * and add the AdSense script to index.html:
 *   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
 *
 * To activate AdMob: set localStorage.setItem('NATIVE_APP', 'true') in Capacitor init.
 */
export default function AdBanner({ position = 'top', size = 'medium' }) {
  const { isMobileApp } = useAdPlatform();

  // Push AdSense ad unit when component mounts (web only)
  useEffect(() => {
    if (!isMobileApp) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ignore ad load failures silently.
      }
    }
  }, [isMobileApp]);

  // AdMob: the native SDK places its banner at specified coordinates.
  // We just provide a spacer so content doesn't get hidden behind the native ad.
  if (isMobileApp) {
    const heights = { small: 50, medium: 50, large: 90, full: 250 };
    return <div style={{ height: heights[size] || 50 }} className="w-full shrink-0" aria-hidden="true" />;
  }

  // AdSense banner for web
  const sizeStyles = {
    small:  { minHeight: 60 },
    medium: { minHeight: 90 },
    large:  { minHeight: 120 },
    full:   { minHeight: 280 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-xl"
      style={sizeStyles[size]}
    >
      {/* AdSense unit – replace slot IDs below */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', ...sizeStyles[size] }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      {/* Placeholder shown while AdSense loads / if blocked */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-900/25 via-black/40 to-purple-900/25 border border-purple-500/20 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-purple-400/50 text-xs font-medium">Advertisement</p>
          <p className="text-gray-600 text-xs">ca-pub-XXXXXXXXXXXXXXXX</p>
        </div>
      </div>
    </motion.div>
  );
}
