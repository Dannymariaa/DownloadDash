import React from "react";

const cards = [
  {
    title: "Public links only",
    text: "DownloadDash is built for publicly available links and does not support bypassing private account protections."
  },
  {
    title: "No social passwords",
    text: "We do not ask users to enter TikTok, Instagram, YouTube, Facebook, or other social media passwords."
  },
  {
    title: "Responsible use",
    text: "Users are expected to respect copyright, creators, platform rules, and local laws."
  },
  {
    title: "Clear policies",
    text: "Privacy, Terms, DMCA, Responsible Use, Safety, FAQ, and Contact pages are available for transparency."
  }
];

export default function HomepageTrustUpgrade() {
  return (
    <section className="bg-black px-5 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">Trust & Safety</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            A cleaner, safer-looking way to save public media links
          </h2>
          <p className="mt-4 text-gray-300">
            DownloadDash is designed to avoid suspicious downloader-site patterns like fake buttons, password requests,
            confusing redirects, and unclear policies.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-purple-500/25 bg-white/[0.04] p-5 shadow-[0_0_30px_rgba(139,92,246,0.12)]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-200">✓</div>
              <h3 className="font-bold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">{card.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-purple-500/25 bg-purple-500/10 p-6">
          <h3 className="text-2xl font-bold">Responsible downloading matters</h3>
          <p className="mt-3 leading-7 text-gray-300">
            Users should only save content they own, have permission to use, or are legally allowed to save.
            DownloadDash does not encourage piracy, private-content bypassing, or misuse of creator content.
          </p>
        </div>
      </div>
    </section>
  );
}
