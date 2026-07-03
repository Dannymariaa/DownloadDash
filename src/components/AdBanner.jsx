import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdPlatform } from './Ads/useAdPlatform';
import { ADSTERRA_UNITS, loadAdsterraScript, getResponsiveBanner } from '@/config/adsterraConfig';

/**
 * Smart Ad Banner - loads Adsterra responsive banners and leaves stable space in native shells.
 *
 * To activate native mode in Capacitor, add:
 *   localStorage.setItem('NATIVE_APP', 'true');
 */
export default function AdBanner({ position = 'top', size = 'medium' }) {
  const { isMobileApp } = useAdPlatform();
  const [bannerConfig, setBannerConfig] = useState(null);
  const [bannerId, setBannerId] = useState('');

  if (isMobileApp) {
    const heights = { small: 50, medium: 50, large: 90, full: 250 };
    return <div style={{ height: heights[size] || 50 }} className="w-full shrink-0" aria-hidden="true" />;
  }

  // Handle responsive banner selection and window resize
  useEffect(() => {
    const handleResize = () => {
      const config = getResponsiveBanner();
      const id = `ad-banner-${position}-${size}-${config.id}`;
      setBannerId(id);
      setBannerConfig(config);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, size]);

  // Load Adsterra script when banner config is determined
  useEffect(() => {
    if (!bannerConfig || !bannerId) return;

    if (bannerConfig.format === 'iframe') {
      const atOptions = {
        key: bannerConfig.key,
        format: 'iframe',
        height: bannerConfig.height,
        width: bannerConfig.width,
      };

      // Small delay to ensure container is in DOM
      const timer = setTimeout(() => {
        loadAdsterraScript(bannerId, bannerConfig.scriptSrc, atOptions);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [bannerConfig, bannerId]);

  if (!bannerConfig) {
    return null;
  }

  const sizeStyles = {
    small: { minHeight: 60 },
    medium: { minHeight: 90 },
    large: { minHeight: 120 },
    full: { minHeight: 280 },
  };

  return (
    <motion.div
      id={bannerId}
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 via-black/40 to-purple-900/20 flex items-center justify-center"
      style={{
        ...sizeStyles[size],
        width: `${bannerConfig.width}px`,
        height: `${bannerConfig.height}px`,
        minHeight: `${bannerConfig.height}px`,
      }}
      aria-label="Advertisement space"
    >
      {/* Adsterra script will inject ad here */}
    </motion.div>
  );
}
