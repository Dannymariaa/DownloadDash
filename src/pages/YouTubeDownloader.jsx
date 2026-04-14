import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import downloadDash from '@/api/downloadDashClient';
import { YouTubeIcon } from '@/components/PlatformIcons';

export default function YouTubeDownloader() {
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
      platform="youtube"
      platformName="YouTube"
      platformIcon={<YouTubeIcon size={56} />}
      gradientFrom="from-red-600"
      gradientTo="to-red-500"
      supportedTypes={['Videos', 'Shorts', 'Audio', 'Playlists']}
      placeholderUrl="https://www.youtube.com/watch?v=..."
      user={user}
    />
  );
}