/**
 * Data mode is explicit configuration, never a silent fallback:
 *   NEXT_PUBLIC_DATA_MODE=supabase  -> real Supabase project (Auth, Postgres, private Storage). Missing keys = hard error.
 *   NEXT_PUBLIC_DATA_MODE=mock      -> read-only demo data from src/lib/contracts/fixtures.ts (no database, no sign-in).
 * When unset, a missing Supabase configuration means demo mode so a fresh clone still runs; a configured project never
 * falls back to demo data when a query fails.
 */
export type DataMode = "supabase" | "mock";

export function dataMode(): DataMode {
  // NEXT_PUBLIC_ so server and browser agree (it is a mode switch, not a secret).
  const configured = (process.env.NEXT_PUBLIC_DATA_MODE ?? "").toLowerCase();
  if (configured === "supabase" || configured === "mock") return configured;
  if (configured) throw new Error(`NEXT_PUBLIC_DATA_MODE must be "supabase" or "mock", got "${configured}"`);
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "mock";
}

export function isMockMode() {
  return dataMode() === "mock";
}
