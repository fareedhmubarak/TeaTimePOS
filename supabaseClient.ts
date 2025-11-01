import { createClient } from '@supabase/supabase-js';

// =================================================================================
// IMPORTANT: Replace with your Supabase project's URL and anon key.
// You can find these in your Supabase project dashboard under Settings > API.
// =================================================================================
const supabaseUrl = 'https://sycfmzaxktwdcxwiqbbw.supabase.co'; // e.g., 'https://your-project-id.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2ZtemF4a3R3ZGN4d2lxYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDgyMDgsImV4cCI6MjA3MzMyNDIwOH0.XZ7yIt0utodwtO3UsiFbcuyqL2FUbGmKmxDKAB0Jd-4';
// =================================================================================

// Create and export the Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
