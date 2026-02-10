'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Dashboard } from '@/lib/types';

export default function HomePage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [newName, setNewName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboards = async () => {
    const { data } = await supabase
      .from('dashboards')
      .select('*')
      .order('created_at', { ascending: false });
    setDashboards((data || []) as Dashboard[]);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth');
        return;
      }
      setUserId(session.user.id);
      await loadDashboards();
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const createDashboard = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !userId) return;
    const { error } = await supabase.from('dashboards').insert({ name: trimmed, user_id: userId });
    if (!error) {
      setNewName('');
      await loadDashboards();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return <main className="p-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">FastLane Show System</h1>
        <button onClick={signOut} className="rounded bg-slate-700 px-3 py-2 text-white">Sign Out</button>
      </div>

      <div className="mb-8 rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Create New Dashboard</h2>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded border p-2"
            placeholder="Morning Show"
          />
          <button onClick={createDashboard} className="rounded bg-blue-600 px-4 py-2 text-white">Create New Dashboard</button>
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">Your Dashboards</h2>
        <ul className="space-y-3">
          {dashboards.map((dashboard) => (
            <li key={dashboard.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{dashboard.name}</p>
                <p className="text-sm text-slate-500">{new Date(dashboard.created_at).toLocaleString()}</p>
              </div>
              <Link href={`/dashboard/${dashboard.id}`} className="rounded bg-emerald-600 px-4 py-2 text-white">Open</Link>
            </li>
          ))}
          {dashboards.length === 0 && <p className="text-slate-500">No dashboards yet.</p>}
        </ul>
      </div>
    </main>
  );
}
