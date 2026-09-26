import { useEffect } from 'react';
import adManager from '@/lib/adManager';

export default function MonetagInitializer() {
  useEffect(() => {
    adManager.startMonetagNotificationScheduler(2500);
    return () => adManager.stopMonetagNotificationScheduler();
  }, []);

  return null;
}
