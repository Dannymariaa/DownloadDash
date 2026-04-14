import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function InstagramDownloader() {
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
      platform="instagram"
      platformName="Instagram"
      platformIcon="📸"
      gradientFrom="from-purple-600"
      gradientTo="to-orange-400"
      supportedTypes={['Reels', 'Posts', 'IGTV', 'Highlights']}
      placeholderUrl="https://www.instagram.com/p/reel/..."
      user={user}
    />
  );
}
