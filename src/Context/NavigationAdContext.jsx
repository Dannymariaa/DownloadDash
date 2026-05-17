import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';
import { useAdPlatform } from '@/components/Ads/useAdPlatform';

const NavigationAdContext = createContext({ navigateWithAd: (path) => {} });

export function useNavigationAd() {
  return useContext(NavigationAdContext);
}

export function NavigationAdProvider({ children }) {
  const [pendingPath, setPendingPath] = useState(null);
  const navigate = useNavigate();
  const { isMobileApp } = useAdPlatform();

  const navigateWithAd = (path) => {
    setPendingPath(path);
  };

  const handleSkip = () => {
    const path = pendingPath;
    setPendingPath(null);
    if (path) navigate(path);
  };

  return (
    <NavigationAdContext.Provider value={{ navigateWithAd }}>
      {children}

      <AnimatePresence>
        {pendingPath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/99 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded font-medium">AD</span>
                <span className="text-gray-400 text-sm">Loading next platform...</span>
              </div>

              <div className="aspect-video bg-gray-900 rounded-2xl border border-purple-500/20 flex items-center justify-center relative overflow-hidden mb-4">
                {isMobileApp ? (
                  <div className="flex flex-col items-center text-center p-8">
                    <Smartphone className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-gray-400">AdMob Transition Ad</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full mb-5"
                    />
                    <p className="text-white text-lg font-bold">Switching Platform</p>
                    <p className="text-gray-400 text-sm mt-1">Quick ad while we load the page</p>
                    {/* Replace with your real AdSense ins tag */}
                    <div className="mt-5 w-64 h-12 bg-gray-800 rounded-xl border border-purple-500/20 flex items-center justify-center">
                      <span className="text-gray-600 text-xs">AdSense Transition Space</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-gray-600 text-xs">Ad helps keep DownloadDash free</p>
                <motion.button
                  initial={{ scale: 0.96 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleSkip}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-medium text-sm transition-colors"
                >
                  Continue <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NavigationAdContext.Provider>
  );
}
