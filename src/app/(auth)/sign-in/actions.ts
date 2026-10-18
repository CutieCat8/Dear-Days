"use server";

import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/paths";
import { DEMO_EMAIL } from "@/lib/demo/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DemoSignInState = { error: string | null };

/** Signs in to the shared demo account. The password stays on the server (DEMO_ACCOUNT_PASSWORD), never in the page. */
export async function signInAsDemo(_previous: DemoSignInState, formData: FormData): Promise<DemoSignInState> {
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) return { error: "The demo account is not set up on this server." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password });
  if (error) return { error: "We could not open the demo account. Please try again in a moment." };

  redirect(safeNextPath(String(formData.get("next") ?? "/")));
}
