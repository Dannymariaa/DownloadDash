import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function PinterestDownloader() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await downloadDash.auth.isAuthenticated();
        if (isAuth) {
          const userData = await downloadDash.auth.me();
          setUser(userData);
        }
      } catch {
        console.log('Not authenticated');
      }
    };
    loadUser();
  }, []);

  return (
    <DownloaderTemplate
      platform="pinterest"
      platformName="Pinterest"
      platformIcon="📌"
      gradientFrom="from-red-500"
      gradientTo="to-pink-500"
      supportedTypes={['Images', 'Videos', 'Pins', 'Boards']}
      placeholderUrl="https://www.pinterest.com/pin.it/..."
      user={user}
    />
  );
}
