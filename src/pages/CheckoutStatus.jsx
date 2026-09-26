import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function CheckoutStatus() {
  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-zinc-950 p-6">
        <h1 className="text-3xl font-bold">Checkout status</h1>
        <p className="mt-3 text-gray-300">
          Pro activates only after DownloadDash receives and verifies the payment provider webhook. Sandbox checkout is wired for development while production billing is configured.
        </p>
        <Button asChild className="mt-6 bg-emerald-400 text-black hover:bg-emerald-300">
          <Link to="/account">Back to account</Link>
        </Button>
      </div>
    </div>
  );
}
