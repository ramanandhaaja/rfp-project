import { createClient } from '@supabase/supabase-js';

// Supabase client creator for API routes with build-time safety
// Provides default values during build to prevent crashes
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

  return createClient(supabaseUrl, supabaseKey);
}
