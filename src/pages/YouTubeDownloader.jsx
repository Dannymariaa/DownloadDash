import React, { useState, useEffect } from 'react';
import DownloaderTemplate from '@/components/DownloaderTemplate';
import downloadDash from '@/api/downloadDashClient';
import { YouTubeIcon } from '@/components/PlatformIcons';
import useSEO from '@/hooks/useSEO';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';

export default function YouTubeDownloader() {
  const [user, setUser] = useState(null);

  useSEO({
    title: 'YouTube Downloader - Download Videos HD 1080p | DownloadDash',
    description: 'Download YouTube videos in HD quality without watermark. Fast, free, and no sign-up required. Save videos in MP4, WebM, and audio formats.',
    keywords: 'YouTube downloader, download YouTube videos, YouTube video saver, HD YouTube downloader, YouTube mp4 downloader, free YouTube downloader, YouTube video download without watermark',
    canonical: `${SEO_BASE_URL}/youtube-downloader`,
    ogTitle: 'YouTube Downloader - Download Videos HD 1080p',
    ogDescription: 'Download YouTube videos in HD quality for free. No watermark, no sign-up, instant download.',
    structuredData: generateStructuredData.downloadPage('YouTube Downloader', 'YouTube'),
    breadcrumbs: generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'YouTube Downloader', url: '/youtube-downloader' },
    ]),
  });

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