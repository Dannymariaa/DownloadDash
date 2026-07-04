import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import adManager from '@/lib/adManager';

export default function MonetagInitializer() {
  const location = useLocation();

  useEffect(() => {
    adManager.loadMonetag().catch((error) => {
      console.warn('Monetag script failed to load', error);
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      adManager.triggerMonetag().catch((error) => {
        console.warn('Monetag trigger failed', error);
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
