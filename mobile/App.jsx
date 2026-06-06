import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { resolveDownload, getApiBaseUrl } from './utils/api';

const AD_GATE_SECONDS = {
  videoHD: 30,
  videoSD: 5,
  image: 5,
  album: 5,
};

const QUALITY_OPTIONS = [
  { label: 'HD', value: 'high' },
  { label: 'SD', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const prettyPlatform = (platform) => {
  if (!platform) return 'Unknown';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};

const ActionButton = ({ label, onPress, variant = 'primary', disabled = false }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.actionButton,
      variant === 'secondary' ? styles.secondaryButton : styles.primaryButton,
      disabled && styles.disabledButton,
    ]}
  >
    <Text style={[styles.actionButtonText, variant === 'secondary' && styles.secondaryButtonText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DownloadOption = ({ label, url, gateType, onDownloadRequest }) => {
  if (!url) return null;

  const openUrl = async () => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Cannot open link', 'Your device could not open this download URL.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ActionButton
      label={label}
      onPress={() => onDownloadRequest ? onDownloadRequest({ label, url, gateType, action: openUrl }) : openUrl()}
      variant="secondary"
    />
  );
};

const DownloadAlbumOption = ({ items, onDownloadRequest }) => {
  const photoItems = Array.isArray(items)
    ? items.filter((item) => item?.url && item.type !== 'audio')
    : [];

  if (photoItems.length < 2) return null;

  const openAll = async () => {
    for (const item of photoItems) {
      const canOpen = await Linking.canOpenURL(item.url);
      if (canOpen) {
        await Linking.openURL(item.url);
      }
    }
  };

  return (
    <ActionButton
      label={`Open All Photos (${photoItems.length})`}
      onPress={() =>
        onDownloadRequest({
          label: `All Photos (${photoItems.length})`,
          url: photoItems[0]?.url,
          gateType: 'album',
          action: openAll,
        })
      }
      variant="secondary"
    />
  );
};

export default function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [quality, setQuality] = useState('high');
  const [extractAudio, setExtractAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [adGate, setAdGate] = useState(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const handleResolve = async () => {
    if (!videoUrl.trim()) {
      Alert.alert('Paste a link', 'Enter a supported public media link before continuing.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setResult(null);

    try {
      const data = await resolveDownload({
        url: videoUrl.trim(),
        quality,
        extractAudio,
      });

      if (!data.primaryUrl) {
        throw new Error('The API did not return a downloadable file link for this media.');
      }

      setResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setErrorMessage(message);
      Alert.alert('Download failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const openPrimaryDownload = async () => {
    if (!result?.primaryUrl) return;
    const canOpen = await Linking.canOpenURL(result.primaryUrl);
    if (!canOpen) {
      Alert.alert('Cannot open link', 'Your device could not open the returned download link.');
      return;
    }
    await Linking.openURL(result.primaryUrl);
  };

  const requestDownload = ({ label, gateType, action }) => {
    const waitSeconds = AD_GATE_SECONDS[gateType] || 0;
    if (!waitSeconds) {
      action();
      return;
    }

    setAdGate({ label, secondsLeft: waitSeconds, canClaim: false, action });
    let remaining = waitSeconds;
    const intervalId = setInterval(() => {
      remaining -= 1;
      setAdGate((current) => {
        if (!current) {
          clearInterval(intervalId);
          return current;
        }
        return { ...current, secondsLeft: Math.max(remaining, 0), canClaim: remaining <= 0 };
      });
      if (remaining <= 0) clearInterval(intervalId);
    }, 1000);
  };

  const handlePrimaryDownload = () => {
    requestDownload({
      label: extractAudio ? 'Audio / MP3' : 'HD Video',
      gateType: extractAudio ? 'audio' : 'videoHD',
      action: openPrimaryDownload,
    });
  };

  const claimAdReward = () => {
    const action = adGate?.action;
    setAdGate(null);
    if (action) action();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#05010d" />
      <Modal visible={Boolean(adGate)} transparent animationType="fade" onRequestClose={() => setAdGate(null)}>
        <View style={styles.adOverlay}>
          <View style={styles.adModal}>
            <Text style={styles.adEyebrow}>Advertisement</Text>
            <Text style={styles.adTitle}>{adGate?.label}</Text>
            <View style={styles.adBox}>
              <Text style={styles.adBoxText}>Sponsored content</Text>
            </View>
            <Text style={styles.adCountdown}>
              {adGate?.canClaim ? 'Ad complete. Claim your award to start the download.' : `Claim award unlocks in ${adGate?.secondsLeft || 0}s.`}
            </Text>
            <ActionButton label="Claim Award" onPress={claimAdReward} disabled={!adGate?.canClaim} />
            <ActionButton label="Cancel" onPress={() => setAdGate(null)} variant="secondary" />
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.badge}>DownloadDash Mobile</Text>
          <Text style={styles.title}>Expo app connected to your live API</Text>
          <Text style={styles.subtitle}>
            Paste a supported public link, let the app talk to your backend, and open the returned media download link on Android, iPhone, iPad, tablet, or desktop web builds.
          </Text>
          <Text style={styles.apiText}>API: {apiBaseUrl}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Media URL</Text>
          <TextInput
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#7a7390"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />

          <Text style={styles.label}>Quality</Text>
          <View style={styles.optionRow}>
            {QUALITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setQuality(option.value)}
                style={[
                  styles.optionChip,
                  quality === option.value && styles.optionChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    quality === option.value && styles.optionChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setExtractAudio((current) => !current)}
            style={styles.toggleRow}
          >
            <View style={[styles.checkbox, extractAudio && styles.checkboxActive]} />
            <Text style={styles.toggleText}>Download audio only when available</Text>
          </TouchableOpacity>

          <ActionButton
            label={isLoading ? 'Resolving...' : 'Resolve Download'}
            onPress={handleResolve}
            disabled={isLoading}
          />

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#b976ff" />
              <Text style={styles.loadingText}>Contacting DownloadDash API...</Text>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        {result ? (
          <View style={styles.card}>
            <Text style={styles.resultPlatform}>{prettyPlatform(result.platform)}</Text>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultMeta}>Type: {result.mediaType}</Text>

            <ActionButton
              label={extractAudio ? 'Open Audio Download' : 'Open Main Download'}
              onPress={handlePrimaryDownload}
            />

            <View style={styles.downloadOptions}>
              <DownloadOption label="Open HD Video" url={result.downloads.videoHD} gateType="videoHD" onDownloadRequest={requestDownload} />
              <DownloadOption label="Open SD Video" url={result.downloads.videoSD} gateType="videoSD" onDownloadRequest={requestDownload} />
              <DownloadOption label="Open Audio" url={result.downloads.audio} gateType="audio" onDownloadRequest={requestDownload} />
              <DownloadAlbumOption items={result.downloads.items} onDownloadRequest={requestDownload} />
              <DownloadOption label="Open Image" url={result.downloads.image} gateType="image" onDownloadRequest={requestDownload} />
            </View>
          </View>
        ) : null}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Next build steps</Text>
          <Text style={styles.footerText}>1. Run `npm install` inside `mobile`.</Text>
          <Text style={styles.footerText}>2. Run `npx expo start` and scan the QR code with Expo Go.</Text>
          <Text style={styles.footerText}>3. Run `eas build:configure` once.</Text>
          <Text style={styles.footerText}>4. Run `eas build -p android --profile preview` for an APK.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#05010d',
  },
  container: {
    padding: 20,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#12071d',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#43205f',
  },
  badge: {
    color: '#d4b4ff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#c4bfd3',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  apiText: {
    color: '#8f84a8',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#0e0917',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c1a3f',
  },
  label: {
    color: '#f5f2ff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#150d22',
    borderColor: '#3f2759',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4f3b66',
    backgroundColor: '#140e1d',
  },
  optionChipActive: {
    backgroundColor: '#a447ff',
    borderColor: '#cf9dff',
  },
  optionChipText: {
    color: '#d0c8de',
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#73528f',
    backgroundColor: '#130b1f',
  },
  checkboxActive: {
    backgroundColor: '#b251ff',
    borderColor: '#e0c1ff',
  },
  toggleText: {
    color: '#e0dae9',
    fontSize: 14,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8b33ff',
  },
  secondaryButton: {
    backgroundColor: '#171022',
    borderWidth: 1,
    borderColor: '#5d3f7e',
  },
  disabledButton: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#f3ebff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  loadingText: {
    color: '#d3c6ea',
    fontSize: 14,
  },
  errorText: {
    color: '#ff95a3',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  resultPlatform: {
    color: '#ca9dff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  resultMeta: {
    color: '#bbb1cc',
    marginBottom: 18,
  },
  downloadOptions: {
    marginTop: 4,
  },
  footerCard: {
    backgroundColor: '#11081b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2f1c42',
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  footerText: {
    color: '#ccc4d9',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  adOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  adModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0e0917',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#5d3f7e',
  },
  adEyebrow: {
    color: '#ca9dff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  adTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
  adBox: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3f2759',
    backgroundColor: '#150d22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  adBoxText: {
    color: '#d3c6ea',
    fontWeight: '700',
  },
  adCountdown: {
    color: '#ccc4d9',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
});
