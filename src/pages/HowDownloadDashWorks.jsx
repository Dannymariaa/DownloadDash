import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, Link2, Shield, Download, SearchCheck } from 'lucide-react';

const steps = [
  {
    icon: <Link2 className="h-7 w-7" />,
    title: 'Step 1: Paste a supported public link',
    body:
      'Users begin with a public media URL from a supported platform. DownloadDash is built around public links and does not ask users to bypass platform sign-in walls, private content restrictions, or account protections.',
  },
  {
    icon: <SearchCheck className="h-7 w-7" />,
    title: 'Step 2: The backend checks what the source allows',
    body:
      'The connected API resolves the public link and returns any formats, qualities, or preview details that are actually available from the source at that moment. That means results can differ depending on the platform, media type, and upstream restrictions.',
  },
  {
    icon: <Download className="h-7 w-7" />,
    title: 'Step 3: Users choose the returned format',
    body:
      'DownloadDash presents the available file options instead of pretending every file is always downloadable. When the source offers multiple qualities or audio-only output, users can choose the option that best fits their device and storage needs.',
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Step 4: Users remain responsible for lawful use',
    body:
      'DownloadDash is intended for personal, lawful workflows. Users should only save content they own, have permission to use, or are otherwise legally allowed to download in their jurisdiction.',
  },
];

export default function HowDownloadDashWorks() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">How DownloadDash Works</h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-8">
            This guide explains the flow behind DownloadDash, what the service is designed to do, and why some links work differently depending on source availability and platform restrictions.
          </p>
        </div>

        <div className="grid gap-6 mb-10">
          {steps.map((step) => (
            <article key={step.title} className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-5">
                {step.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
              <p className="text-gray-400 leading-7">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-white/[0.03] p-7">
          <h2 className="text-2xl font-bold text-white mb-3">Why this matters for users</h2>
          <p className="text-gray-400 leading-7 mb-4">
            A lot of media utility sites hide the process and make every request look identical. DownloadDash takes the opposite approach: it explains device install behavior, lawful use boundaries, and troubleshooting expectations so users understand what is happening before they click a download button.
          </p>
          <Link
            to={createPageUrl('Troubleshooting')}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            Read Troubleshooting Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
