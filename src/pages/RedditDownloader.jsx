import React, { useEffect, useState } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import { downloadDash } from '@/api/downloadDashClient';

export default function RedditDownloader() {
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
      platform="reddit"
      platformName="Reddit"
      platformIcon="Reddit"
      gradientFrom="from-orange-600"
      gradientTo="to-red-500"
      supportedTypes={['Posts', 'Videos', 'Images', 'Galleries']}
      placeholderUrl="https://www.reddit.com/r/subreddit/comments/..."
      user={user}
    />
  );
}
