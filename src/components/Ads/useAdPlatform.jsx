import { useState, useEffect } from 'react';

/**
 * Detects if the app is running as a native mobile app (Capacitor/WebView)
 * vs a web browser. This prevents Monetag web ads and native app ads from colliding.
 *
 * - isMobileApp === true: native layer handles ads
 * - isMobileApp === false: use Monetag web ads
 *
 * To force native mode in Capacitor, add to your capacitor init:
 *   localStorage.setItem('NATIVE_APP', 'true');
 */
export function useAdPlatform() {
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    const safeNavigator = typeof navigator !== 'undefined' ? navigator : { userAgent: '' };
    let nativeFlag = false;
    try {
      nativeFlag = localStorage.getItem('NATIVE_APP') === 'true';
    } catch {
      nativeFlag = false;
    }

    const isNative =
      (typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined') ||
      /\bwv\b/i.test(safeNavigator.userAgent || '') ||
      (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') ||
      nativeFlag;

    setIsMobileApp(isNative);
  }, []);

  return { isMobileApp, isWebApp: !isMobileApp };
}
