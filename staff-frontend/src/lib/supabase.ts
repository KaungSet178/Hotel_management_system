import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mzmkiivcjbnhjjymiuha.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bWtpaXZjamJuaGpqeW1pdWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAxMTMsImV4cCI6MjEwNzIxNjExM30.dpWn0I6u1N4DHHqvDMbO3IaKf__-nG_aqDMtgDMJKhk';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    import.meta.env.MODE !== 'test',
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'stayflow.staff.supabase.auth.token',
      },
    })
  : null;
