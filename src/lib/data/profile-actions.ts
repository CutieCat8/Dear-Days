"use server";

import { revalidatePath } from "next/cache";

import type { DataError, Profile } from "@/lib/contracts/types";

import { updateProfile } from "./profile";

export type ProfileFormState = { error?: DataError; saved?: Profile };

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const result = await updateProfile({ display_name: String(formData.get("display_name") ?? "") });
  if (!result.ok) return { error: result.error };
  // The display name also shows in the app shell, so refresh every page under the (app) layout.
  revalidatePath("/", "layout");
  return { saved: result.data };
}
