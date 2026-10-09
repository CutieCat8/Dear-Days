import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { url, key } = requireSupabaseConfig();
  return createBrowserClient(url, key);
}
