import React from 'react';
import { AlertTriangle, RefreshCcw, ShieldCheck, Smartphone } from 'lucide-react';

const issues = [
  {
    title: 'A public link does not resolve',
    body:
      'This usually means the source post was removed, made private, geo-restricted, temporarily blocked, or changed by the platform. It can also happen when upstream services rate-limit the backend.',
    icon: <AlertTriangle className="h-7 w-7" />,
  },
  {
    title: 'A download option appears, but the final file fails',
    body:
      'Some platforms expose metadata or preview details more easily than final media delivery. In those cases, the file endpoint can fail later because the source has added extra checks, cookies have expired, or a backend IP is being challenged.',
    icon: <RefreshCcw className="h-7 w-7" />,
  },
  {
    title: 'The site looks unsafe on an older phone',
    body:
      'Very old Android and iOS devices may show insecure-connection warnings because their operating systems no longer trust modern certificate chains or TLS requirements. That is often a device trust-store problem rather than a website-code problem.',
    icon: <ShieldCheck className="h-7 w-7" />,
  },
  {
    title: 'The app install flow is confusing on mobile',
    body:
      'The web app and the Android APK are not the same thing. iPhone and iPad use Add to Home Screen. Android can use the web app too, but direct APK installation only works when a real signed APK has been uploaded and the file matches the device requirements.',
    icon: <Smartphone className="h-7 w-7" />,
  },
];

export default function Troubleshooting() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Troubleshooting Guide</h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-8">
            When a download tool is connected to many third-party platforms, failures can happen for a lot of reasons. This guide explains the most common ones so users can tell the difference between a temporary source problem and a true site issue.
          </p>
        </div>

        <div className="grid gap-6">
          {issues.map((issue) => (
            <article key={issue.title} className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-5">
                {issue.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{issue.title}</h2>
              <p className="text-gray-400 leading-7">{issue.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
