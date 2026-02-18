import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fallback for development – helps catch misconfigured env quickly
  // Do not throw to avoid breaking the entire app in production builds.
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
      "Supabase features will be disabled until environment variables are configured."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Enable automatic session detection from URL (for OAuth callbacks)
        detectSessionInUrl: true,
        // Persist session in localStorage
        persistSession: true,
        // Auto-refresh the session when it expires
        autoRefreshToken: true,
      },
    })
  : null;

