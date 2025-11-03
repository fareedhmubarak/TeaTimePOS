import { createClient } from '@supabase/supabase-js';

// =================================================================================
// IMPORTANT: Replace with your Supabase project's URL and anon key.
// You can find these in your Supabase project dashboard under Settings > API.
// =================================================================================
const supabaseUrl = 'https://sycfmzaxktwdcxwiqbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2ZtemF4a3R3ZGN4d2lxYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDgyMDgsImV4cCI6MjA3MzMyNDIwOH0.XZ7yIt0utodwtO3UsiFbcuyqL2FUbGmKmxDKAB0Jd-4';
// =================================================================================

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check supabaseClient.ts');
}

// Create and export the Supabase client with explicit headers
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist session in localStorage for POS app
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  },
});

// Verify connection on module load
console.log('[supabaseClient] Initialized with URL:', supabaseUrl);
console.log('[supabaseClient] API key present:', !!supabaseAnonKey && supabaseAnonKey.length > 0);
