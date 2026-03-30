import { createClient } from '@supabase/supabase-js';

// =================================================================================
// IMPORTANT: Replace with your Supabase project's URL and anon key.
// You can find these in your Supabase project dashboard under Settings > API.
// =================================================================================
const supabaseUrl = 'https://yvtuztmveynsotbmycxv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dHV6dG12ZXluc290Ym15Y3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDM0NjksImV4cCI6MjA5MDQxOTQ2OX0.DwrvZjQuV39GLgrp0Iw0i3tqYooIrR-HCp1qjoRiq9s';
// =================================================================================

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check supabaseClient.ts');
}

// Create and export the Supabase client with explicit global headers
// This ensures the API key is always included in requests, especially in production builds
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  },
  realtime: {
    // Disable realtime for now to avoid connection issues
    params: {
      eventsPerSecond: 0,
    },
  },
});

// Verify connection on module load
console.log('[supabaseClient] Initialized with URL:', supabaseUrl);
console.log('[supabaseClient] API key present:', !!supabaseAnonKey && supabaseAnonKey.length > 0);
console.log('[supabaseClient] API key length:', supabaseAnonKey.length);
