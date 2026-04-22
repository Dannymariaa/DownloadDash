import React from 'react';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
    <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
    <div className="space-y-3 text-gray-300 leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-purple-300 font-semibold mb-2">DownloadDash Legal</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: April 22, 2026</p>
        </div>

        <div className="space-y-6">
          <Section title="Overview">
            <p>
              DownloadDash provides tools that help users resolve and save media from supported platforms.
              This Privacy Policy explains what information we collect, how we use it, and the choices you have.
            </p>
          </Section>

          <Section title="Information We Collect">
            <p>We may collect basic usage information such as pages visited, device/browser type, approximate location, and error logs to improve performance and reliability.</p>
            <p>If you create an account or save downloads to your dashboard, we may store account details, saved content references, and download history needed to provide those features.</p>
            <p>When you submit a media URL, it may be sent to our API service so we can process the request.</p>
          </Section>

          <Section title="Cookies, Ads, And Analytics">
            <p>
              DownloadDash may use cookies or similar technologies for security, preferences, analytics, and advertising.
              Third-party advertising partners, including Google AdSense, may use cookies to show and measure ads.
            </p>
            <p>
              You can control cookies in your browser settings. Some features may not work correctly if cookies are disabled.
            </p>
          </Section>

          <Section title="How We Use Information">
            <p>We use information to operate the service, process download requests, improve app performance, prevent abuse, show ads, respond to support requests, and comply with legal obligations.</p>
          </Section>

          <Section title="Sharing">
            <p>
              We do not sell your personal information. We may share limited information with service providers that help us host, secure, analyze, advertise, or operate DownloadDash.
            </p>
          </Section>

          <Section title="Data Retention">
            <p>
              We keep information only as long as needed to provide the service, improve reliability, meet legal requirements, or protect against abuse.
            </p>
          </Section>

          <Section title="Your Choices">
            <p>
              You may request access, correction, or deletion of personal information associated with your account by contacting us.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this Privacy Policy can be sent through our Contact page or by email at{' '}
              <a className="text-purple-300 hover:text-purple-200" href="mailto:support@downloaddash.store">
                support@downloaddash.store
              </a>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
