import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import { BannerAdManager } from '../utils/admobManager';

export default function BannerAd({ placement = 'banner', style }) {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    showBannerAd();
    return () => {
      hideBannerAd();
    };
  }, [placement]);

  const showBannerAd = async () => {
    try {
      await BannerAdManager.show(placement);
      setAdLoaded(true);
    } catch (error) {
      console.log('Banner ad error:', error);
    }
  };

  const hideBannerAd = async () => {
    try {
      await BannerAdManager.hide();
      setAdLoaded(false);
    } catch (error) {
      console.log('Hide banner error:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {adLoaded && (
        <View style={styles.adContainer}>
          <Text style={styles.placeholder}>Advertisement</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  placeholder: {
    fontSize: 12,
    color: '#999',
  },
});
