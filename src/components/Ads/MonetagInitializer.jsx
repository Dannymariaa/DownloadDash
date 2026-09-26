import { useEffect } from 'react';
import adManager from '@/lib/adManager';
import adScheduler from '@/lib/adScheduler';
import { useAuth } from '@/lib/AuthContext';

const unregisterMonetagServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL?.endsWith('/sw.js'))
      .map((registration) => registration.unregister())
  );
};

export default function MonetagInitializer() {
  const { entitlements, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const adFree = Boolean(entitlements?.adFree);

  useEffect(() => {
    adScheduler.setAdEntitlements({ adFree });
  }, [adFree]);

  useEffect(() => {
    if (isLoadingPublicSettings || isLoadingAuth) return undefined;
    if (adFree) {
      adManager.stopMonetagNotificationScheduler();
      unregisterMonetagServiceWorker().catch(() => {});
      return undefined;
    }
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Monetag service worker registration failed:', error);
      });
    }
    adManager.startMonetagNotificationScheduler(2500);
    return () => adManager.stopMonetagNotificationScheduler();
  }, [adFree, isLoadingAuth, isLoadingPublicSettings]);

  return null;
}
