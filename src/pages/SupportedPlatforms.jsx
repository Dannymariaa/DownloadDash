import React from 'react';
import { CheckCircle2, Globe, Layers, Smartphone } from 'lucide-react';

const platforms = [
  {
    name: 'YouTube',
    body:
      'DownloadDash can process supported public YouTube watch links and shorts links when the backend is able to resolve formats from the source. Availability can vary based on the media type, region, and upstream access restrictions.',
  },
  {
    name: 'Instagram, TikTok, Facebook, Reddit, X, Pinterest, Telegram',
    body:
      'Other supported platforms can return video, audio, or image results depending on what the original source exposes through the connected backend. Some platforms are more stable than others, and a public link does not always guarantee a downloadable result.',
  },
  {
    name: 'Device support',
    body:
      'DownloadDash is designed to work on modern Android phones, iPhones, tablets, desktop browsers, and installable web app environments. Android APK distribution is separate from the web app and only works when a real signed APK is uploaded.',
  },
];

const principles = [
  'Public links only — private or restricted posts may fail by design.',
  'Returned formats depend on what the source platform currently exposes.',
  'The service does not guarantee the same output for every platform or every post.',
  'Users should expect temporary failures during upstream blocking, rate limiting, or source-side changes.',
];

export default function SupportedPlatforms() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <Globe className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Supported Platforms And Devices</h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-8">
            This page explains the kinds of platforms and devices DownloadDash is built for, and why format availability can vary from one media source to another.
          </p>
        </div>

        <div className="grid gap-6 mb-10">
          {platforms.map((platform, index) => (
            <article key={platform.name} className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7">
              <div className="flex items-center gap-3 mb-4">
                {index === 0 ? <Layers className="h-7 w-7 text-purple-300" /> : index === 1 ? <CheckCircle2 className="h-7 w-7 text-purple-300" /> : <Smartphone className="h-7 w-7 text-purple-300" />}
                <h2 className="text-2xl font-bold text-white">{platform.name}</h2>
              </div>
              <p className="text-gray-400 leading-7">{platform.body}</p>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-purple-500/20 bg-white/[0.03] p-7">
          <h2 className="text-2xl font-bold text-white mb-4">What users should understand</h2>
          <div className="grid gap-4">
            {principles.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-purple-500/10 bg-black/20 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
