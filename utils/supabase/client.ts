import type { Database } from '@/supabase/types';
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient<Database>(
    // biome-ignore lint: Forbidden non-null assertion.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // biome-ignore lint: Forbidden non-null assertion.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );