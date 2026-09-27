import { useEffect } from 'react';
import adManager from '@/lib/adManager';
import adScheduler from '@/lib/adScheduler';
import { useAuth } from '@/lib/AuthContext';

const MONETAG_NOTIFICATION_DELAY_MS = 2 * 60 * 1000;

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
    adManager.installBrowserAdGuards();
    unregisterMonetagServiceWorker().catch(() => {});
    if (adFree) {
      adManager.stopMonetagNotificationScheduler();
      return undefined;
    }
    adManager.startMonetagNotificationScheduler(MONETAG_NOTIFICATION_DELAY_MS);
    return () => adManager.stopMonetagNotificationScheduler();
  }, [adFree, isLoadingAuth, isLoadingPublicSettings]);

  return null;
}
