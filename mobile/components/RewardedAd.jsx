import React from 'react';
import { View, StyleSheet, Button, Text, Modal, Alert } from 'react-native';
import { RewardedAdManager } from '../utils/admobManager';

export default function RewardedAd({ feature = 'UnlockPremium', onReward }) {
  const [adVisible, setAdVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const showRewardedAd = async () => {
    try {
      setAdVisible(true);
      setIsLoading(true);
      
      const reward = await RewardedAdManager.show();
      
      setIsLoading(false);
      setAdVisible(false);

      if (reward) {
        Alert.alert('Reward Earned!', `You've earned: ${reward.amount} ${reward.type}`);
        if (onReward) onReward(reward);
      }
    } catch (error) {
      console.log('Rewarded ad error:', error);
      setIsLoading(false);
      setAdVisible(false);
    }
  };

  const handleShowAd = () => {
    showRewardedAd();
  };

  return (
    <View style={styles.container}>
      <Button
        title={`Watch Ad for ${feature}`}
        onPress={handleShowAd}
        color="#FF9800"
      />
      <Modal
        visible={adVisible}
        transparent
        onRequestClose={() => !isLoading && setAdVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.adBox}>
            {isLoading && (
              <>
                <Text style={styles.adText}>Loading Rewarded Ad...</Text>
                <Text style={styles.subText}>Please wait</Text>
              </>
            )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 280,
  },
  adText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
});
