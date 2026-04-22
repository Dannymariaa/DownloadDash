import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function TikTokDownloader() {
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
      platform="tiktok"
      platformName="TikTok"
      platformIcon="🎵"
      gradientFrom="from-pink-500"
      gradientTo="to-cyan-500"
      supportedTypes={['Videos', 'Stories', 'Public Links', 'Format Options']}
      placeholderUrl="https://www.tiktok.com/@username/photo/video/..."
      user={user}
    />
  );
}
