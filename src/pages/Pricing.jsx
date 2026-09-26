import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { DOWNLOADDASH_PLANS } from '@/config/proConfig';
import downloadDash from '@/api/downloadDashClient';
import { useAuth } from '@/lib/AuthContext';

const freeFeatures = [
  'Normal downloads',
  'Multi-media downloads',
  'Download selected/all',
  'ZIP downloads',
  'Supported video, audio, and image formats',
  'Includes limited advertising',
];

const proFeatures = [
  'Ad-free experience',
  'No popups or redirect ads',
  'No notification ads',
  'No download ad gate',
  'Pro account badge',
  'Support future premium features',
];

export default function Pricing() {
  const { isAuthenticated, isPro } = useAuth();

  const startCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login?next=/pricing';
      return;
    }
    const checkout = await downloadDash.billing.checkout();
    window.location.href = checkout.checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_80%_8%,rgba(59,130,246,0.16),transparent_32%)]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">DownloadDash Pro</p>
            <h1 className="mt-3 text-4xl font-bold md:text-5xl">Choose how you download</h1>
            <p className="mt-4 text-lg text-gray-300">
              Free stays useful. Pro starts with a cleaner ad-free experience and an entitlement system ready for future premium tools.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-10 md:grid-cols-2">
        <PlanCard
          icon={Shield}
          title="FREE"
          price={DOWNLOADDASH_PLANS.free.priceLabel}
          features={freeFeatures}
          action={<Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10"><Link to={createPageUrl('Home')}>Keep Using Free</Link></Button>}
        />
        <PlanCard
          icon={Crown}
          title="PRO"
          price={DOWNLOADDASH_PLANS.pro.priceLabel}
          highlight
          features={proFeatures}
          action={
            isPro ? (
              <Button asChild className="w-full bg-emerald-400 text-black hover:bg-emerald-300"><Link to={createPageUrl('Account')}>Manage Pro</Link></Button>
            ) : (
              <Button onClick={startCheckout} className="w-full bg-emerald-400 text-black hover:bg-emerald-300">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}

function PlanCard({ icon: Icon, title, price, features, action, highlight = false }) {
  return (
    <section className={`rounded-lg border p-6 ${highlight ? 'border-emerald-300/40 bg-emerald-300/10' : 'border-white/10 bg-zinc-950'}`}>
      <Icon className={highlight ? 'h-7 w-7 text-emerald-300' : 'h-7 w-7 text-cyan-300'} />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <div className="mt-3 text-3xl font-bold">{price}</div>
      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <div className="mt-8">{action}</div>
    </section>
  );
}
