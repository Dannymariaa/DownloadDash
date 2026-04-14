import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Home from './pages/Home';
import TikTokDownloader from './pages/TikTokDownloader';
import InstagramDownloader from './pages/InstagramDownloader';
import FacebookDownloader from './pages/FacebookDownloader';
import TwitterDownloader from './pages/TwitterDownloader';
import WhatsAppBusinessStatusSaver from './pages/WhatsAppBusinessStatusSaver';
import TelegramSaver from './pages/TelegramSaver';
import YouTubeDownloader from './pages/YouTubeDownloader';
import PinterestDownloader from './pages/PinterestDownloader';
import RedditDownloader from './pages/RedditDownloader';
import Dashboard from './pages/Dashboard';
import RecommendedApps from './pages/RecommendedApps';
import WhatsAppStatusSaver from './pages/WhatsAppStatusSaver';
import Layout from './Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/TikTokDownloader" element={<TikTokDownloader />} />
          <Route path="/InstagramDownloader" element={<InstagramDownloader />} />
          <Route path="/FacebookDownloader" element={<FacebookDownloader />} />
          <Route path="/TwitterDownloader" element={<TwitterDownloader />} />
          <Route path="/WhatsAppBusinessStatusSaver" element={<WhatsAppBusinessStatusSaver />} />
          <Route path="/TelegramSaver" element={<TelegramSaver />} />
          <Route path="/YouTubeDownloader" element={<YouTubeDownloader />} />
          <Route path="/PinterestDownloader" element={<PinterestDownloader />} />
          <Route path="/RedditDownloader" element={<RedditDownloader />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/RecommendedApps" element={<RecommendedApps />} />
          <Route path="/WhatsAppStatusSaver" element={<WhatsAppStatusSaver />} />
          {/* Catch all - show home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
