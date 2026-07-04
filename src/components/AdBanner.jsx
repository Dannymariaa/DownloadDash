import React from 'react';
import { AdsterraBanner } from '@/components/Ads/AdsterraAds';

const sizeToUnit = {
  small: 'banner320x50',
  medium: 'banner300x250',
  large: 'banner728x90',
  full: 'banner300x250',
};

export default function AdBanner({ position = 'default', size = 'medium' }) {
  const unitKey = sizeToUnit[size] || 'banner300x250';
  return <AdsterraBanner unitKey={unitKey} placement={position} />;
}
