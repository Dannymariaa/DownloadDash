import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { initializeAdMob } from './utils/admobManager';
import AdDemoScreen from './screens/AdDemoScreen';

const admobConfig = Constants.expoConfig?.extra?.admob;

export default function App() {
  useEffect(() => {
    setupApp();
  }, []);

  const setupApp = async () => {
    try {
      await initializeAdMob();
      console.log('App initialized with AdMob');
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <AdDemoScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
