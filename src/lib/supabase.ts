import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseInstance = SupabaseClient | null;

function getSupabaseClient(): SupabaseInstance {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }
}

export const supabase: SupabaseInstance = getSupabaseClient();
