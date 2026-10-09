import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { z } from "zod";

import type { DataResult } from "@/lib/contracts/types";

import { fail, failFrom, ok } from "./result";

export const profileInputSchema = z.object({
  display_name: z.string().trim().min(1, "Please enter a display name").max(50),
  bio: z.string().trim().max(160).nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type Profile = { user_id: string; email: string | null; display_name: string; bio: string | null };

export async function getMyProfile(client: SupabaseClient<Database>): Promise<DataResult<Profile>> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return fail("UNAUTHENTICATED", "Please sign in to continue.");
  const { data, error } = await client.from("profiles").select("user_id, display_name, bio").eq("user_id", auth.user.id).maybeSingle();
  if (error) return failFrom(error);
  if (!data) return fail("NOT_FOUND", "We could not find your profile.");
  return ok({ user_id: data.user_id as string, email: auth.user.email ?? null, display_name: data.display_name as string, bio: (data.bio as string | null) ?? null });
}

export async function updateMyProfile(client: SupabaseClient<Database>, input: ProfileInput): Promise<DataResult<Profile>> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return fail("UNAUTHENTICATED", "Please sign in to continue.");
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Please check your details.", { field_errors: { display_name: [parsed.error.issues[0]?.message ?? "Invalid"] } });
  }
  const { error } = await client.from("profiles").update({ display_name: parsed.data.display_name, bio: parsed.data.bio?.length ? parsed.data.bio : null }).eq("user_id", auth.user.id);
  if (error) return failFrom(error);
  return getMyProfile(client);
}

export type RoomMember = { user_id: string; role: "owner" | "member"; display_name: string };

/** Members (with display names) for several rooms. Names come from profiles visible to you through RLS. */
export async function listRoomMembers(client: SupabaseClient<Database>, roomIds: string[]): Promise<DataResult<Map<string, RoomMember[]>>> {
  const result = new Map<string, RoomMember[]>();
  if (roomIds.length === 0) return ok(result);
  const { data: members, error } = await client.from("room_members").select("room_id, user_id, role, joined_at").in("room_id", roomIds).order("joined_at");
  if (error) return failFrom(error);
  const ids = [...new Set((members ?? []).map((row) => row.user_id as string))];
  const { data: profiles, error: profileError } = await client.from("profiles").select("user_id, display_name").in("user_id", ids);
  if (profileError) return failFrom(profileError);
  const names = new Map((profiles ?? []).map((row) => [row.user_id as string, row.display_name as string]));
  for (const row of members ?? []) {
    const list = result.get(row.room_id as string) ?? [];
    list.push({ user_id: row.user_id as string, role: row.role as "owner" | "member", display_name: names.get(row.user_id as string) ?? "Member" });
    result.set(row.room_id as string, list);
  }
  return ok(result);
}
