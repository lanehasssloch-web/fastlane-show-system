'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  return createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-anon-key',
  });
}
