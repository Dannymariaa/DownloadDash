import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdPlatform } from './Ads/useAdPlatform';
import { ADSENSE_CLIENT_ID, loadAdsenseAfterDelay } from '@/utils/delayed-ads-loader';

const ADSENSE_SLOT_ID = import.meta.env.VITE_ADSENSE_SLOT_ID || '';

/**
 * Smart Ad Banner – shows AdSense on web, leaves space for AdMob on native app.
 * AdSense and AdMob will NEVER show at the same time.
 *
 * To activate AdMob: set localStorage.setItem('NATIVE_APP', 'true') in Capacitor init.
 */
export default function AdBanner({ position = 'top', size = 'medium' }) {
  const { isMobileApp } = useAdPlatform();

  // Push AdSense ad unit when component mounts (web only)
  useEffect(() => {
    let cancelled = false;

    if (!isMobileApp && ADSENSE_SLOT_ID) {
      loadAdsenseAfterDelay().then((loaded) => {
        if (!loaded || cancelled) return;

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // Ignore ad load failures silently.
        }
      });
    }

    return () => {
      cancelled = true;
    };
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

  if (!ADSENSE_SLOT_ID) {
    return (
      <div
        className="w-full rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 via-black/40 to-purple-900/20 flex items-center justify-center"
        style={sizeStyles[size]}
        aria-label="Advertisement space"
      >
        <p className="text-purple-300/60 text-xs font-medium">Advertisement</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-xl"
      style={sizeStyles[size]}
    >
      {/* AdSense unit */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', ...sizeStyles[size] }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      {/* Placeholder shown while AdSense loads / if blocked */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-900/25 via-black/40 to-purple-900/25 border border-purple-500/20 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-purple-400/50 text-xs font-medium">Advertisement</p>
        </div>
      </div>
    </motion.div>
  );
}
