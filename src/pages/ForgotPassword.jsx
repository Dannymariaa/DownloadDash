import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import downloadDash from '@/api/downloadDashClient';
import { AuthShell } from './Login';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const result = await downloadDash.auth.forgotPassword({ email });
    setMessage(result.resetToken ? `Reset token for development: ${result.resetToken}` : 'If an account exists, reset instructions will be sent.');
  };

  return <AuthShell title="Reset password" subtitle="Request a password reset link.">
    <form onSubmit={submit} className="space-y-4">
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button className="w-full bg-emerald-400 text-black hover:bg-emerald-300">Send reset link</Button>
      {message && <p className="break-words text-sm text-gray-300">{message}</p>}
    </form>
  </AuthShell>;
}
