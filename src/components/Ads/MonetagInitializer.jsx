import { useEffect } from 'react';
import adManager from '@/lib/adManager';

export default function MonetagInitializer() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      adManager.triggerMonetag().catch((error) => {
        console.warn('Monetag trigger failed', error);
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
