import React from "react";
import PageShell from "./PageShell";

export function AboutPage() {
  return (
    <PageShell
      title="About DownloadDash"
      subtitle="An independent public-link media saver focused on clean design, privacy-conscious use, and transparency."
    >
      <p>DownloadDash is built to make saving publicly available videos and images simpler and more responsible.</p>
      <h2>Our Mission</h2>
      <p>We want DownloadDash to feel different from unsafe downloader websites by avoiding fake buttons, confusing redirects, hidden malware, and unclear policies.</p>
      <h2>Our Commitments</h2>
      <ul>
        <li>Public links only.</li>
        <li>No social media password collection.</li>
        <li>Clear legal and privacy pages.</li>
        <li>Creator-respect policy.</li>
        <li>Mobile-first, clean design.</li>
      </ul>
      <h2>Contact</h2>
      <p>Support: support@downloaddash.store</p>
      <p>Legal: legal@downloaddash.store</p>
      <p>General: info@downloaddash.store</p>
    </PageShell>
  );
}

export function SafetyPage() {
  return (
    <PageShell title="Safety Center" subtitle="How DownloadDash works to avoid unsafe downloader-site patterns.">
      <h2>Safety Commitments</h2>
      <ul>
        <li>No fake download buttons.</li>
        <li>No hidden malware downloads.</li>
        <li>No request for social media passwords.</li>
        <li>No intentional private-content bypassing.</li>
        <li>Clear responsible-use policy.</li>
      </ul>
      <h2>User Safety Tips</h2>
      <p>Only use the official domain, avoid entering passwords into downloader tools, and respect creators’ rights.</p>
    </PageShell>
  );
}

export function ResponsibleUsePage() {
  return (
    <PageShell title="Responsible Use" subtitle="DownloadDash is intended for lawful, respectful, public-link media saving.">
      <h2>Allowed</h2>
      <ul>
        <li>Saving your own content.</li>
        <li>Saving content you have permission to use.</li>
        <li>Personal offline viewing where allowed.</li>
        <li>Educational or fair-use purposes where legally permitted.</li>
      </ul>
      <h2>Not Allowed</h2>
      <ul>
        <li>Piracy or unauthorized redistribution.</li>
        <li>Bypassing private accounts or login restrictions.</li>
        <li>Removing creator credit.</li>
        <li>Harassment, impersonation, or illegal use.</li>
      </ul>
    </PageShell>
  );
}
