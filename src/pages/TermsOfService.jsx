import React from 'react';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-purple-500/20 bg-white/[0.03] p-6">
    <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
    <div className="space-y-3 text-gray-300 leading-relaxed">{children}</div>
  </section>
);

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-purple-300 font-semibold mb-2">DownloadDash Legal</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Terms of Service</h1>
          <p className="text-gray-400">Last updated: April 22, 2026</p>
        </div>

        <div className="space-y-6">
          <Section title="Acceptance Of Terms">
            <p>
              By using DownloadDash, you agree to these Terms of Service. If you do not agree, please do not use the service.
            </p>
          </Section>

          <Section title="Permitted Use">
            <p>
              DownloadDash is intended for lawful personal use. You are responsible for ensuring that you have the right to access, download, store, or share any content you process through the service.
            </p>
          </Section>

          <Section title="Copyright And Platform Rules">
            <p>
              Do not use DownloadDash to infringe copyrights, bypass access controls, violate platform terms, or distribute content without permission.
              We may restrict or remove access where we believe the service is being misused.
            </p>
          </Section>

          <Section title="Accounts And Saved Content">
            <p>
              If account features are available, you are responsible for keeping your login information secure and for all activity under your account.
            </p>
          </Section>

          <Section title="Advertising">
            <p>
              DownloadDash may display ads. We may change ad formats, placements, or partners as needed to support the service.
            </p>
          </Section>

          <Section title="No Warranty">
            <p>
              DownloadDash is provided on an "as is" and "as available" basis. We do not guarantee that every platform, video, audio file, or image will be available at all times.
            </p>
          </Section>

          <Section title="Limitation Of Liability">
            <p>
              To the fullest extent allowed by law, DownloadDash is not liable for indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </Section>

          <Section title="Changes To These Terms">
            <p>
              We may update these Terms from time to time. Continued use of DownloadDash after updates means you accept the revised Terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these Terms can be sent through our Contact page or by email at{' '}
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
