import React from 'react';
import { View, StyleSheet, Button, Text, Modal } from 'react-native';
import { InterstitialAdManager } from '../utils/admobManager';

export default function InterstitialAd({ trigger = 'afterDownload', onComplete }) {
  const [adVisible, setAdVisible] = React.useState(false);

  const showInterstitialAd = async () => {
    try {
      setAdVisible(true);
      await InterstitialAdManager.show();
      setAdVisible(false);
      if (onComplete) onComplete();
    } catch (error) {
      console.log('Interstitial ad error:', error);
      setAdVisible(false);
      if (onComplete) onComplete();
    }
  };

  const handleShowAd = () => {
    showInterstitialAd();
  };

  return (
    <View style={styles.container}>
      <Button
        title={`Show ${trigger} Ad`}
        onPress={handleShowAd}
        color="#4CAF50"
      />
      <Modal
        visible={adVisible}
        transparent
        onRequestClose={() => setAdVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.adBox}>
            <Text style={styles.adText}>Advertisement Loading...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 300,
  },
  adText: {
    fontSize: 16,
    color: '#333',
  },
});
