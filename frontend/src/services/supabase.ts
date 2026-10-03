import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jyuazhyurgmjshbhvulp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dWF6aHl1cmdtanNoYmh2dWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ3MjIsImV4cCI6MjEwNjM1MDcyMn0.Z03QCY9TVlA9HfkRiNB82OxO2GRfpUCIZnXhUprGheo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const checkSupabaseHealth = async (): Promise<{ connected: boolean; latencyMs: number }> => {
  const start = performance.now();
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    const end = performance.now();
    return {
      connected: !error,
      latencyMs: Math.round(end - start),
    };
  } catch (e) {
    return {
      connected: false,
      latencyMs: 0,
    };
  }
};
