import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import { useAuth } from '@/lib/AuthContext';
import { AuthShell } from './Login';

export default function Signup() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await downloadDash.auth.signup(form);
      await checkAppState();
      navigate('/account');
    } catch (e) {
      setError(e.message);
    }
  };

  return <AuthShell title="Create account" subtitle="Use Free now, upgrade to Pro when you are ready.">
    <form onSubmit={submit} className="space-y-4">
      <Input placeholder="Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button className="w-full bg-emerald-400 text-black hover:bg-emerald-300"><UserPlus className="mr-2 h-4 w-4" />Sign up</Button>
      <Link to="/login" className="block text-sm text-gray-400 hover:text-white">Already have an account?</Link>
    </form>
  </AuthShell>;
}
