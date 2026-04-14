import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Text, Button, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { initializeAdMob, getAdUnitId } from '../utils/admobManager';
import BannerAd from '../components/BannerAd';
import InterstitialAd from '../components/InterstitialAd';
import RewardedAd from '../components/RewardedAd';

const admobConfig = Constants.expoConfig?.extra?.admob;

export default function AdDemoScreen() {
  const [initialized, setInitialized] = useState(false);
  const currentPlatform = Platform.OS === 'ios' ? 'iOS' : 'Android';

  useEffect(() => {
    initAdMob();
  }, []);

  const initAdMob = async () => {
    const success = await initializeAdMob();
    setInitialized(success);
  };

  const handleReward = (reward) => {
    Alert.alert(
      'Premium Feature Unlocked',
      `You've earned ${reward.amount} ${reward.type}. Premium feature unlocked!`
    );
  };

  const getPlatformAdUnits = () => {
    const isIOS = Platform.OS === 'ios';
    return isIOS ? admobConfig?.ios : admobConfig?.android;
  };

  const adUnits = getPlatformAdUnits();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DownloadDash AdMob Demo</Text>
        <Text style={styles.subtitle}>{currentPlatform} Platform</Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>AdMob Status:</Text>
        <Text style={initialized ? styles.successText : styles.errorText}>
          {initialized ? '✓ Initialized' : '✗ Failed'}
        </Text>
      </View>

      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>AdMob Configuration</Text>
        <View style={styles.configBox}>
          <Text style={styles.configText}>App ID: {admobConfig?.appId}</Text>
        </View>

        <Text style={styles.sectionTitle}>Ad Units ({currentPlatform})</Text>
        <View style={styles.configBox}>
          <Text style={styles.configLabel}>Banner (Bottom):</Text>
          <Text style={styles.configValue}>{adUnits?.bannerBottom}</Text>

          <Text style={styles.configLabel}>Interstitial (After Save):</Text>
          <Text style={styles.configValue}>{adUnits?.interstitialAfterSave}</Text>

          <Text style={styles.configLabel}>Rewarded (Unlock Premium):</Text>
          <Text style={styles.configValue}>{adUnits?.rewardedUnlockPremium}</Text>
        </View>
      </View>

      <View style={styles.demoSection}>
        <Text style={styles.sectionTitle}>Ad Type Demos</Text>

        <View style={styles.adDemo}>
          <Text style={styles.demoTitle}>1. Banner Ad (Bottom)</Text>
          <Text style={styles.demoDescription}>
            Displays at the bottom of the screen
          </Text>
          <BannerAd placement="banner" />
        </View>

        <View style={styles.adDemo}>
          <Text style={styles.demoTitle}>2. Interstitial Ad (After Save)</Text>
          <Text style={styles.demoDescription}>
            Full-screen ad shown after user saves content
          </Text>
          <InterstitialAd
            trigger="afterDownload"
            onComplete={() => Alert.alert('Ad Closed', 'Interstitial ad completed')}
          />
        </View>

        <View style={styles.adDemo}>
          <Text style={styles.demoTitle}>3. Rewarded Ad (Unlock Premium)</Text>
          <Text style={styles.demoDescription}>
            User watches ad to unlock premium features
          </Text>
          <RewardedAd feature="UnlockPremium" onReward={handleReward} />
        </View>
      </View>

      <View style={styles.footerBox}>
        <Text style={styles.footerText}>
          ✓ All ad units are configured and ready for production
        </Text>
      </View>

      <View style={styles.spacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  statusBox: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 5,
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  configSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    marginTop: 15,
  },
  configBox: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  configText: {
    fontSize: 12,
    color: '#aaa',
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66BB6A',
    marginTop: 8,
    marginBottom: 3,
  },
  configValue: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#0a0a0a',
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  demoSection: {
    padding: 15,
  },
  adDemo: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  demoDescription: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
  },
  footerBox: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1a5e20',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#c8e6c9',
    textAlign: 'center',
  },
  spacing: {
    height: 40,
  },
});
