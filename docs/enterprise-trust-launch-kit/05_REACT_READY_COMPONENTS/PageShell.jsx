import React from "react";

export default function PageShell({ eyebrow = "DownloadDash Trust Center", title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-purple-500/30 bg-white/5 p-7 shadow-[0_0_45px_rgba(139,92,246,0.20)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-3xl text-gray-300">{subtitle}</p>}
        </div>
        <article className="prose prose-invert prose-purple max-w-none leading-8">
          {children}
        </article>
      </section>
    </main>
  );
}
