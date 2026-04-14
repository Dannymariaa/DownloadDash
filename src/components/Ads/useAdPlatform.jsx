import { useState, useEffect } from 'react';

/**
 * Detects if the app is running as a native mobile app (Capacitor/WebView)
 * vs a web browser. This prevents AdSense and AdMob from colliding.
 *
 * - isMobileApp === true  → use AdMob (native layer handles ads)
 * - isMobileApp === false → use AdSense (web-based ads)
 *
 * To force native mode in Capacitor, add to your capacitor init:
 *   localStorage.setItem('NATIVE_APP', 'true');
 */
export function useAdPlatform() {
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    const isNative =
      (typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined') ||
      /\bwv\b/i.test(navigator.userAgent) ||
      window.location.protocol === 'capacitor:' ||
      localStorage.getItem('NATIVE_APP') === 'true';

    setIsMobileApp(isNative);
  }, []);

  return { isMobileApp, isWebApp: !isMobileApp };
}