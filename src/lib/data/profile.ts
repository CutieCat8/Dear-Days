import { MOODS } from "@/lib/contracts/constants";
import { profileInputSchema } from "@/lib/contracts/schemas";
import type { DataResult, Mood, Profile, ProfileInput } from "@/lib/contracts/types";

import { mockDb, nowIso } from "./mock-store";
import type { MoodOverview, MoodOverviewRange, ProfileStats } from "./profile-types";
import { fail, ok, validationFailure } from "./result";
import { getSessionEmail, getSessionUserId, isRoomMember } from "./session";

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

/** The signed-in user's own email for their Profile page. Not part of Profile, so other members never get it. */
export async function getAccountEmail(): Promise<DataResult<string>> {
  const email = await getSessionEmail();
  return email ? ok(email) : fail("UNAUTHENTICATED", "Please sign in.");
}

/**
 * Mood counts of memories the user wrote within the last `months` months (up to today).
 * TODO(R5/R6): Supabase — `select mood, count(*) from memories where author_id = auth.uid()
 *   and memory_date between $from and $to group by mood`.
 */
export async function getMoodOverview(months: MoodOverviewRange, today = new Date()): Promise<DataResult<MoodOverview>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");

  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, today.getUTCDate() + 1));
  const from = start.toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  const counts = Object.fromEntries(MOODS.map((mood) => [mood, 0])) as Record<Mood, number>;
  let no_mood = 0;
  for (const memory of mockDb().memories) {
    if (memory.author_id !== userId || memory.memory_date < from || memory.memory_date > to) continue;
    if (memory.mood) counts[memory.mood] += 1;
    else no_mood += 1;
  }
  return ok({ months, from, to, counts, no_mood });
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
