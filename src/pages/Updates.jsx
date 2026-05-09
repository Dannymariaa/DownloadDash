import React from 'react';
import { ListChecks } from 'lucide-react';
import { updateNotes } from '@/content/enterpriseTrustContent';

export default function Updates() {
  return (
    <div className="min-h-screen bg-[#0d0d12] text-white">
      <section className="border-b border-violet-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(167,139,250,0.18),_transparent_30%),linear-gradient(180deg,#11111a_0%,#0d0d12_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-200/80">Product Updates</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">A changelog that makes the platform feel maintained.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            DownloadDash improves trust wording, help content, mobile polish, and public-link explanations over time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 space-y-5">
        {updateNotes.map(([version, notes]) => (
          <article key={version} className="rounded-2xl border border-violet-300/15 bg-white/[0.04] p-7">
            <div className="mb-4 flex items-center gap-3 text-violet-100">
              <ListChecks className="h-6 w-6" />
              <h2 className="text-2xl font-bold">{version}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((note) => (
                <div key={note} className="rounded-xl border border-white/10 bg-black/20 p-4 text-slate-300">
                  {note}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
