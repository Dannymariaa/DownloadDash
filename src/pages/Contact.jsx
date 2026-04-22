import React from 'react';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-purple-300 font-semibold mb-2">We are here to help</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Contact DownloadDash</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Have a question, support request, copyright concern, or partnership idea? Reach out and we will get back to you as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <div className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
            <Mail className="h-8 w-8 text-purple-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Support</h2>
            <p className="text-gray-400 text-sm mb-4">For app issues, downloads, accounts, and general help.</p>
            <a className="text-purple-300 hover:text-purple-200" href="mailto:support@downloaddash.store">
              support@downloaddash.store
            </a>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
            <ShieldCheck className="h-8 w-8 text-purple-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Legal</h2>
            <p className="text-gray-400 text-sm mb-4">For privacy, terms, copyright, and compliance questions.</p>
            <a className="text-purple-300 hover:text-purple-200" href="mailto:legal@downloaddash.store">
              legal@downloaddash.store
            </a>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
            <MessageCircle className="h-8 w-8 text-purple-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Response Time</h2>
            <p className="text-gray-400 text-sm">
              We aim to respond within 2-3 business days. Please include the page URL, device type, and a short description of the issue.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-black p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-3">Before You Email</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            DownloadDash cannot help users download private, restricted, or copyrighted content they do not have permission to use.
            Please only use DownloadDash for content you own, have permission to download, or are legally allowed to save.
          </p>
          <a
            href="mailto:support@downloaddash.store?subject=DownloadDash%20Support%20Request"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
