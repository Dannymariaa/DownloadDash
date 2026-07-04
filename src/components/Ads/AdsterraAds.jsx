import React, { useEffect, useId, useRef, useState } from 'react';
import { ADSTERRA_BREAKPOINT, ADSTERRA_UNITS } from '@/config/adsterraConfig';
import adManager from '@/lib/adManager';
import { useAdPlatform } from './useAdPlatform';

const useVisible = (rootMargin = '220px') => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return [ref, visible];
};

const useViewport = () => {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
};

export function AdsterraBanner({ unitKey, placement = 'default', className = '' }) {
  const { isMobileApp } = useAdPlatform();
  const reactId = useId().replace(/:/g, '');
  const containerRef = useRef(null);
  const [visibleRef, isVisible] = useVisible();
  const viewportWidth = useViewport();
  const unit = ADSTERRA_UNITS[unitKey];

  useEffect(() => {
    const container = containerRef.current;
    if (!unit || !container || !isVisible || isMobileApp) return undefined;
    adManager.loadAdsterraBanner({
      unit,
      container,
      placementId: `${placement}-${reactId}`,
    }).catch((error) => {
      console.warn('Adsterra banner failed to load', error);
    });
    return () => adManager.cleanupAdContainer(container);
  }, [isMobileApp, isVisible, placement, reactId, unit]);

  if (!unit || isMobileApp) return null;
  if (unit.desktopOnly && viewportWidth < ADSTERRA_BREAKPOINT) return null;
  if (unit.mobileOnly && viewportWidth >= ADSTERRA_BREAKPOINT) return null;

  const maxWidth = unit.width;
  return (
    <div
      ref={visibleRef}
      className={`mx-auto flex w-full justify-center ${className}`}
      style={{ minHeight: unit.height }}
      aria-label="Advertisement"
    >
      <div
        ref={containerRef}
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: '100%',
          maxWidth,
          minHeight: unit.height,
          height: unit.height,
        }}
      />
    </div>
  );
}

export function AdsterraNativeBanner({ placement = 'native', className = '' }) {
  const { isMobileApp } = useAdPlatform();
  const containerRef = useRef(null);
  const [visibleRef, isVisible] = useVisible('260px');
  const unit = ADSTERRA_UNITS.nativeBanner;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible || isMobileApp) return undefined;
    adManager.loadAdsterraNative({ container }).catch((error) => {
      console.warn('Adsterra native banner failed to load', error);
    });
    return () => {};
  }, [isMobileApp, isVisible, placement]);

  if (isMobileApp) return null;

  return (
    <div
      ref={visibleRef}
      className={`mx-auto flex w-full justify-center ${className}`}
      style={{ minHeight: unit.minHeight }}
      aria-label="Native advertisement"
    >
      <div
        ref={containerRef}
        id={unit.containerId}
        className="w-full max-w-3xl overflow-hidden"
        style={{ minHeight: unit.minHeight, minWidth: unit.minWidth }}
      />
    </div>
  );
}

export function MobileStickyAdsterra() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-purple-500/20 bg-black/85 px-2 py-2 backdrop-blur md:hidden">
      <AdsterraBanner unitKey="banner320x50" placement="mobile-sticky" />
    </div>
  );
}
