'use client';

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(mode === 'signup' ? 'Account created. Check email verification settings in Supabase if enabled.' : 'Logged in.');
    router.push('/');
  };

  return (
    <main className="mx-auto mt-20 max-w-md rounded bg-white p-8 shadow">
      <h1 className="mb-4 text-2xl font-bold">FastLane Auth</h1>
      <form onSubmit={submit} className="space-y-4">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border p-2" placeholder="Email" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border p-2" placeholder="Password" />
        <button className="w-full rounded bg-blue-600 py-2 text-white">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
      </form>
      <button className="mt-3 text-sm text-blue-700" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Login'}
      </button>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </main>
  );
}
