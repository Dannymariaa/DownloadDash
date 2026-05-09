import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { statusItems } from '@/content/enterpriseTrustContent';

export default function SystemStatus() {
  return (
    <div className="min-h-screen bg-[#07110f] text-white">
      <section className="border-b border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_30%),linear-gradient(180deg,#0b1713_0%,#07110f_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200/80">System Status</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">DownloadDash status and platform availability.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Core DownloadDash surfaces are operational. Source-platform availability can still vary because external platforms control public formats and access.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="rounded-2xl border border-emerald-300/15 bg-white/[0.04] p-7">
          <div className="mb-6 flex items-center gap-3 text-emerald-100">
            <Activity className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Current status</h2>
          </div>
          <div className="space-y-4">
            {statusItems.map(([name, status]) => {
              const variable = status.toLowerCase().includes('variable');
              const Icon = variable ? AlertTriangle : CheckCircle2;
              return (
                <div key={name} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${variable ? 'text-amber-200' : 'text-emerald-200'}`} />
                    <span className="font-semibold text-white">{name}</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${variable ? 'bg-amber-300/10 text-amber-100' : 'bg-emerald-300/10 text-emerald-100'}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
