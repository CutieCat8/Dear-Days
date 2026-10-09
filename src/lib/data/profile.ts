import { profileInputSchema } from "@/lib/contracts/schemas";
import type { DataResult, Profile, ProfileInput } from "@/lib/contracts/types";

import { mockDb, nowIso } from "./mock-store";
import { fail, ok, validationFailure } from "./result";
import { getSessionUserId, isRoomMember } from "./session";

export type ProfileStats = { rooms: number; memories: number };

// TODO(R5/R6): Supabase — `select * from profiles where id = auth.uid()` (RLS limits it to the caller).
export async function getCurrentProfile(): Promise<DataResult<Profile>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  const profile = mockDb().profiles.find((item) => item.id === userId);
  return profile ? ok(structuredClone(profile)) : fail("NOT_FOUND", "Profile not found.");
}

// TODO(R5/R6): Supabase — `update profiles set display_name = $1 where id = auth.uid() returning *`.
export async function updateProfile(input: ProfileInput): Promise<DataResult<Profile>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const profile = mockDb().profiles.find((item) => item.id === userId);
  if (!profile) return fail("NOT_FOUND", "Profile not found.");
  Object.assign(profile, parsed.data, { updated_at: nowIso() });
  return ok(structuredClone(profile));
}

/** Rooms the user belongs to and memories they wrote. Not part of DearDaysDataSource; Profile page only. */
// TODO(R5/R6): Supabase — count `room_members where user_id = auth.uid()` and `memories where author_id = auth.uid()`.
export async function getProfileStats(): Promise<DataResult<ProfileStats>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  const db = mockDb();
  return ok({
    rooms: db.rooms.filter((room) => isRoomMember(room.id, userId)).length,
    memories: db.memories.filter((memory) => memory.author_id === userId).length,
  });
}
