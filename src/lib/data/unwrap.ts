import { notFound, redirect } from "next/navigation";

import type { DataResult } from "@/lib/contracts/types";

/**
 * For Server Components: returns the data, or leaves the page by the right route.
 *  UNAUTHENTICATED -> /sign-in, NOT_FOUND/FORBIDDEN -> 404 (a private room is never confirmed to exist),
 *  anything else -> throws so the nearest error.tsx is shown. There is never a silent fallback to other data.
 */
export function unwrap<T>(result: DataResult<T>): T {
  if (result.ok) return result.data;
  const { code, message } = result.error;
  if (code === "UNAUTHENTICATED") redirect("/sign-in");
  if (code === "NOT_FOUND" || code === "FORBIDDEN") notFound();
  throw new Error(message);
}
