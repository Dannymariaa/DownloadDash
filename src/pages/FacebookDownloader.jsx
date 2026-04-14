import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function FacebookDownloader() {
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
      platform="facebook"
      platformName="Facebook"
      platformIcon="👤"
      gradientFrom="from-blue-600"
      gradientTo="to-blue-400"
      supportedTypes={['Videos', 'Stories', 'Reels', 'Live Videos']}
      placeholderUrl="https://www.facebook.com/share/r/share/p/stories/..."
      user={user}
    />
  );
}
