// Public Supabase settings. Both values are safe for the browser; never read a service-role key here.
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return config;
}

// Until Supabase env vars exist, local development runs in mock mode: auth actions skip Supabase and
// the proxy lets every request through. Production never falls back to mock mode.
export function isMockAuthMode() {
  return getSupabaseConfig() === null && process.env.NODE_ENV !== "production";
}
