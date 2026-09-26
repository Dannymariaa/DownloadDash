import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import { AuthShell } from './Login';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: params.get('token') || '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await downloadDash.auth.resetPassword(form);
      navigate('/login');
    } catch (e) {
      setError(e.message);
    }
  };

  return <AuthShell title="Choose new password" subtitle="Finish your DownloadDash password reset.">
    <form onSubmit={submit} className="space-y-4">
      <Input placeholder="Reset token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required />
      <Input type="password" placeholder="New password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button className="w-full bg-emerald-400 text-black hover:bg-emerald-300">Update password</Button>
    </form>
  </AuthShell>;
}
