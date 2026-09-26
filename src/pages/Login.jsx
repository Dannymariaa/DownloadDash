import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await downloadDash.auth.login(form);
      await checkAppState();
      navigate(params.get('next') || '/account');
    } catch (e) {
      setError(e.message);
    }
  };

  return <AuthShell title="Log in" subtitle="Access your DownloadDash account.">
    <form onSubmit={submit} className="space-y-4">
      <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button className="w-full bg-emerald-400 text-black hover:bg-emerald-300"><LogIn className="mr-2 h-4 w-4" />Log in</Button>
      <div className="flex justify-between text-sm text-gray-400">
        <Link to="/signup" className="hover:text-white">Create account</Link>
        <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
      </div>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-md rounded-lg border border-white/10 bg-zinc-950 p-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-gray-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
