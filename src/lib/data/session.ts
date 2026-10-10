import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type SessionUser = { id: string; email: string | null };

const inFlight = new WeakMap<object, Promise<SessionUser | null>>();

/**
 * Who is signed in, without a round trip to the Auth server.
 * `auth.getUser()` calls the Auth API every time (about 200 ms to a hosted project) and the data layer needs the
 * answer in every method, so a page that loads six things paid for six extra requests. `getClaims()` checks the
 * session token locally: the project signs with an asymmetric key (ES256), the public keys are fetched once and
 * cached by supabase-js. Calls that overlap in time share one check; nothing is cached afterwards, so signing out
 * is seen immediately. This is only the "is there a session, and who" check used for friendly errors and ids:
 * every read and write is still authorised by Row Level Security.
 */
export function getSessionUser(client: SupabaseClient<Database>): Promise<SessionUser | null> {
  const pending = inFlight.get(client);
  if (pending) return pending;
  const user = client.auth
    .getClaims()
    .then(({ data, error }) => {
      const sub = data?.claims?.sub;
      if (error || !sub) return null;
      const email = data.claims.email;
      return { id: sub, email: typeof email === "string" ? email : null };
    })
    .catch(() => null)
    .finally(() => inFlight.delete(client));
  inFlight.set(client, user);
  return user;
}
