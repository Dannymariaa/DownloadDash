import React from 'react';
import { Compass } from 'lucide-react';
import { platformGuides } from '@/content/enterpriseTrustContent';

export default function PlatformGuides() {
  return (
    <div className="min-h-screen bg-[#100d08] text-white">
      <section className="border-b border-amber-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(180deg,#17120a_0%,#100d08_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200/80">Platform Guides</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Public media behavior differs by platform.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            These guides explain why links can work differently across platforms and why public accessibility does not guarantee permission to reuse media.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 md:grid-cols-2 lg:grid-cols-3">
        {platformGuides.map(([name, body]) => (
          <article key={name} className="rounded-2xl border border-amber-300/15 bg-white/[0.04] p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-300/10 text-amber-100">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="mb-3 text-xl font-bold">{name}</h2>
            <p className="leading-7 text-slate-300">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
