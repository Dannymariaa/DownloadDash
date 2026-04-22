import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Apple,
  CheckCircle,
  Chrome,
  Download,
  ExternalLink,
  Globe,
  MonitorDown,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdBanner from '@/components/AdBanner';
import { createPageUrl } from '@/utils';

const APK_URL = '/downloads/DownloadDash.apk';

const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return { isAndroid: false, isIOS: false };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return { isAndroid, isIOS };
};

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState('');
  const [apkAvailable, setApkAvailable] = useState(null);
  const device = useMemo(getDeviceInfo, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setInstallMessage('Your browser is ready to install DownloadDash.');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const checkApk = async () => {
      try {
        const response = await fetch(APK_URL, { method: 'HEAD', cache: 'no-store' });
        const contentType = response.headers.get('content-type') || '';
        const looksLikeApk =
          contentType.includes('application/vnd.android.package-archive') ||
          contentType.includes('application/octet-stream');

        setApkAvailable(response.ok && looksLikeApk);
      } catch {
        setApkAvailable(false);
      }
    };

    checkApk();
  }, []);

  const installWebApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setInstallMessage('If the app did not appear on your home screen, use your browser menu and choose Install app.');
      return;
    }

    if (device.isIOS) {
      setInstallMessage('On iPhone or iPad: open this page in Safari, tap Share, then tap Add to Home Screen.');
      return;
    }

    setInstallMessage('Use your browser menu and choose Install app or Add to Home screen.');
  };

  const downloadApk = () => {
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = 'DownloadDash.apk';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-black to-black" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[110px]" />

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-400/30 bg-purple-500/20 shadow-2xl shadow-purple-500/20">
              <Smartphone className="h-10 w-10 text-purple-200" />
            </div>

            <h1 className="mb-4 text-4xl font-black md:text-6xl">DownloadDash Mobile App</h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400 md:text-xl">
              Install DownloadDash from any modern browser. Android users can also use the direct APK download once the APK file is uploaded.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={installWebApp}
                className="h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 text-base font-semibold text-white hover:from-purple-700 hover:to-pink-700"
              >
                <MonitorDown className="mr-2 h-5 w-5" />
                Install Web App
              </Button>

              <Button
                size="lg"
                onClick={downloadApk}
                disabled={apkAvailable === false}
                variant="outline"
                className="h-14 rounded-xl border-purple-500/40 px-8 text-base text-purple-300 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="mr-2 h-5 w-5" />
                {apkAvailable === false ? 'APK Upload Needed' : apkAvailable === null ? 'Checking APK...' : 'Download Android APK'}
              </Button>
            </div>

            {installMessage && (
              <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
                {installMessage}
              </p>
            )}

            {apkAvailable === false && (
              <p className="mx-auto mt-4 max-w-2xl text-sm text-yellow-300">
                APK direct download is wired to <code className="rounded bg-yellow-500/10 px-1 py-0.5">public/downloads/DownloadDash.apk</code>.
                Add the built APK there and redeploy to enable the button.
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            {
              icon: <Chrome className="h-7 w-7" />,
              title: 'Android Browser',
              body: 'Tap Install Web App in Chrome, Edge, Samsung Internet, Opera, Brave, or any browser that supports app install.',
            },
            {
              icon: <Apple className="h-7 w-7" />,
              title: 'iPhone & iPad',
              body: 'Open this page in Safari, tap Share, then choose Add to Home Screen for a full-screen app experience.',
            },
            {
              icon: <Globe className="h-7 w-7" />,
              title: 'PC, Laptop & Tablet',
              body: 'Install from desktop Chrome or Edge, or keep using the website directly in your browser.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-200">
                {item.icon}
              </div>
              <h2 className="mb-2 text-xl font-bold">{item.title}</h2>
              <p className="text-sm leading-6 text-gray-400">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-purple-500/20 bg-white/[0.03] p-6 md:p-8">
          <h2 className="mb-5 text-2xl font-bold text-white">What this supports</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              'Old and new Android browsers',
              'Old and new iOS Safari where home-screen apps are supported',
              'PC, laptop, desktop, tablet, and mobile browsers',
              'Installed web app / PWA mode',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-black/30 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                <span className="text-sm text-gray-300">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to={createPageUrl('YouTubeDownloader')}>
              <Button className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 sm:w-auto">
                Open Downloader
              </Button>
            </Link>
            {apkAvailable && (
              <a href={APK_URL} download="DownloadDash.apk">
                <Button variant="outline" className="w-full rounded-xl border-purple-500/40 text-purple-300 hover:bg-purple-500/20 sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Direct APK Link
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />
            <p className="text-sm leading-6 text-yellow-100">
              For safety, only install the DownloadDash APK from this official website. iOS does not allow normal APK-style direct installs, so iPhone and iPad users should use the Safari home-screen install.
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}
