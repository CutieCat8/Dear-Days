"use client";

import type { DataResult } from "@/lib/contracts/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { DEMO_EMAIL, DEMO_READ_ONLY_EVENT, DEMO_READ_ONLY_MESSAGE } from "./constants";

/** True when the browser session belongs to the demo account (local token check, no network call). */
export async function isDemoSession(): Promise<boolean> {
  // owner switch for local editing: set NEXT_PUBLIC_DEMO_ALLOW_EDIT=true in .env.local (never on the deployed site)
  if (process.env.NEXT_PUBLIC_DEMO_ALLOW_EDIT === "true") return false;
  try {
    const { data } = await createSupabaseBrowserClient().auth.getClaims();
    return data?.claims?.email === DEMO_EMAIL;
  } catch {
    return false;
  }
}

/** Shows the "demo account can't be edited" alert (rendered by `DemoAlertHost`). */
export function notifyDemoReadOnly() {
  window.dispatchEvent(new Event(DEMO_READ_ONLY_EVENT));
}

/** For handlers that write: returns true (after showing the alert) when the caller must stop. */
export async function blockIfDemo(): Promise<boolean> {
  if (!(await isDemoSession())) return false;
  notifyDemoReadOnly();
  return true;
}

export function demoBlockedResult<T>(): DataResult<T> {
  return { ok: false, error: { code: "FORBIDDEN", message: DEMO_READ_ONLY_MESSAGE } };
}
