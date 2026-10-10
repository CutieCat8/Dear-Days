import type { DataResult } from "@/lib/contracts/types";

import type { Account } from "./profile";

/**
 * Turns the result of loading the signed-in person into what the pages need.
 * `null` means exactly one thing: there is no session, so the caller sends the person to sign in.
 * Any other failure (a query that errors, a missing profile row) is a fault, not a signed-out visitor:
 * it is thrown so the nearest error page shows it. Treating it as "signed out" made the page redirect to
 * /sign-in, and the proxy then bounced the still-signed-in person back to Home, hiding the real problem.
 */
export function viewerFromResult(result: DataResult<Account>): Account | null {
  if (result.ok) return result.data;
  if (result.error.code === "UNAUTHENTICATED") return null;
  throw new Error(`Could not load your account: ${result.error.message}`);
}
