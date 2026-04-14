import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function TwitterDownloader() {
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
      platform="twitter"
      platformName="Twitter / X"
      platformIcon="🐦"
      gradientFrom="from-gray-800"
      gradientTo="to-gray-600"
      supportedTypes={['Videos', 'GIFs', 'Images', 'Spaces']}
      placeholderUrl="https://twitter.com/username/status/..."
      user={user}
    />
  );
}
