import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase environment variables are missing!');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
} else if (!supabaseAnonKey.startsWith('ey')) {
    console.warn('WARNING: The Supabase Anon Key does not look like a valid JWT (should usually start with "ey"). Please verify your .env.local credentials.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
)
