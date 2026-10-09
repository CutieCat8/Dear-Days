import { notFound, redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/lib/auth/paths";
import type { DataResult } from "@/lib/contracts/types";

/**
 * For Server Component pages: returns the data, or ends the request.
 * UNAUTHENTICATED → sign-in. NOT_FOUND and FORBIDDEN both → 404, so non-members cannot tell
 * whether a room or memory exists. Anything else throws to the nearest error.tsx.
 */
export function unwrapForPage<T>(result: DataResult<T>): T {
  if (result.ok) return result.data;
  if (result.error.code === "UNAUTHENTICATED") redirect(SIGN_IN_PATH);
  if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") notFound();
  throw new Error(result.error.message);
}
