import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { usernameSchema } from "@/lib/contracts/schemas";
import type { DataResult, Profile, RoomMemberView } from "@/lib/contracts/types";
import type { Database } from "@/lib/supabase/database.types";

import { fail, failFrom, ok } from "./result";
import { getSessionUser } from "./session";
import { signedProfileMediaUrls } from "./profile-media";

/** Account page data: the contract `Profile` plus what only the signed-in person sees (e-mail, short bio) and their handle. */
export type Account = Profile & {
  email: string | null;
  bio: string | null;
  username: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  cover_url: string | null;
};

export const accountInputSchema = z.object({
  display_name: z.string().trim().min(1, "Please enter a display name").max(50),
  bio: z.string().trim().max(160).nullable().optional(),
  username: usernameSchema.optional(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;

type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
  bio?: string | null;
  username?: string;
  created_at: string;
  updated_at: string;
};

export function profileFromRow(row: ProfileRow): Profile {
  return { id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url, created_at: row.created_at, updated_at: row.updated_at };
}

const LEGACY_ACCOUNT_COLUMNS = "user_id, display_name, avatar_url, bio, created_at, updated_at";
const ACCOUNT_COLUMNS = `${LEGACY_ACCOUNT_COLUMNS}, avatar_path, cover_path`;
let warnedAboutUsername = false;
let warnedAboutProfileMedia = false;

function isMissingColumn(error: { code?: string; message?: string } | null, column: string) {
  return error?.code === "42703" && new RegExp(`\\b${column}\\b`).test(error.message ?? "");
}

export async function getMyAccount(client: SupabaseClient<Database>): Promise<DataResult<Account>> {
  const user = await getSessionUser(client);
  if (!user) return fail("UNAUTHENTICATED", "Please sign in to continue.");
  let { data, error } = await client.from("profiles").select(`${ACCOUNT_COLUMNS}, username`).eq("user_id", user.id).maybeSingle();
  if (isMissingColumn(error, "avatar_path") || isMissingColumn(error, "cover_path")) {
    if (!warnedAboutProfileMedia) {
      warnedAboutProfileMedia = true;
      console.warn("[dear-days] profile media columns are missing: apply supabase/migrations/20261011000200_profile_media.sql");
    }
    ({ data, error } = (await client.from("profiles").select(`${LEGACY_ACCOUNT_COLUMNS}, username`).eq("user_id", user.id).maybeSingle()) as unknown as { data: typeof data; error: typeof error });
  }
  if (isMissingColumn(error, "username")) {
    // Rollout skew only: the database has not received migration 20261010000400_friends yet (no profiles.username).
    // Load the profile without it so the app keeps working; usernames and friends stay unavailable until it is applied.
    if (!warnedAboutUsername) {
      warnedAboutUsername = true;
      console.warn("[dear-days] profiles.username is missing: apply supabase/migrations/20261010000400_friends.sql");
    }
    ({ data, error } = (await client.from("profiles").select(ACCOUNT_COLUMNS).eq("user_id", user.id).maybeSingle()) as unknown as { data: typeof data; error: typeof error });
    if (isMissingColumn(error, "avatar_path") || isMissingColumn(error, "cover_path")) {
      ({ data, error } = (await client.from("profiles").select(LEGACY_ACCOUNT_COLUMNS).eq("user_id", user.id).maybeSingle()) as unknown as { data: typeof data; error: typeof error });
    }
  }
  if (error) return failFrom(error);
  if (!data) return fail("NOT_FOUND", "We could not find your profile.");
  const avatarPath = data.avatar_path ?? null;
  const coverPath = data.cover_path ?? null;
  const urls = await signedProfileMediaUrls(client, [avatarPath, coverPath]);
  return ok({
    ...profileFromRow({ ...data, avatar_url: (avatarPath && urls.get(avatarPath)) || data.avatar_url }),
    email: user.email,
    bio: data.bio ?? null,
    username: data.username ?? null,
    avatar_path: avatarPath,
    cover_path: coverPath,
    cover_url: (coverPath && urls.get(coverPath)) || null,
  });
}

/** Contract `getCurrentProfile`: the signed-in user's profile without account-only fields. */
export async function getCurrentProfile(client: SupabaseClient<Database>): Promise<DataResult<Profile>> {
  const account = await getMyAccount(client);
  if (!account.ok) return account;
  return ok(profileFromRow({ user_id: account.data.id, display_name: account.data.display_name, avatar_url: account.data.avatar_url, created_at: account.data.created_at, updated_at: account.data.updated_at }));
}

/** Updates the signed-in user's own profile only (the id comes from the session, never from input). `bio` is only written when given. */
export async function updateMyAccount(client: SupabaseClient<Database>, input: AccountInput): Promise<DataResult<Account>> {
  const user = await getSessionUser(client);
  if (!user) return fail("UNAUTHENTICATED", "Please sign in to continue.");
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "display_name");
    return fail("VALIDATION_ERROR", issue?.message ?? "Please check your details.", { field_errors: { [field]: [issue?.message ?? "Invalid"] } });
  }
  const update: { display_name: string; bio?: string | null; username?: string } = { display_name: parsed.data.display_name };
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio?.length ? parsed.data.bio : null;
  if (parsed.data.username !== undefined) update.username = parsed.data.username;
  const { error } = await client.from("profiles").update(update).eq("user_id", user.id);
  if (error) {
    // unique index on profiles.username
    if (error.code === "23505") return fail("CONFLICT", "That username is taken.", { field_errors: { username: ["That username is taken."] } });
    return failFrom(error);
  }
  return getMyAccount(client);
}

/** Members (public profile data only, never e-mail) for several rooms, owner first. Names come from profiles visible through RLS. */
export async function listRoomMembers(client: SupabaseClient<Database>, roomIds: string[]): Promise<DataResult<Map<string, RoomMemberView[]>>> {
  const result = new Map<string, RoomMemberView[]>();
  if (roomIds.length === 0) return ok(result);
  const { data: members, error } = await client.from("room_members").select("room_id, user_id, role, joined_at").in("room_id", roomIds).order("joined_at");
  if (error) return failFrom(error);
  const ids = [...new Set((members ?? []).map((row) => row.user_id))];
  let { data: profiles, error: profileError } = await client.from("profiles").select("user_id, display_name, avatar_url, avatar_path").in("user_id", ids);
  if (isMissingColumn(profileError, "avatar_path")) {
    ({ data: profiles, error: profileError } = (await client.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids)) as unknown as { data: typeof profiles; error: typeof profileError });
  }
  if (profileError) return failFrom(profileError);
  const urls = await signedProfileMediaUrls(client, (profiles ?? []).map((profile) => profile.avatar_path));
  const byId = new Map((profiles ?? []).map((row) => [row.user_id, row]));
  for (const row of members ?? []) {
    const list = result.get(row.room_id) ?? [];
    const profile = byId.get(row.user_id);
    list.push({
      room_id: row.room_id,
      user_id: row.user_id,
      display_name: profile?.display_name ?? "Member",
      avatar_url: (profile?.avatar_path && urls.get(profile.avatar_path)) || profile?.avatar_url || null,
      role: row.role as RoomMemberView["role"],
      joined_at: row.joined_at,
    });
    result.set(row.room_id, list);
  }
  for (const list of result.values()) list.sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner"));
  return ok(result);
}
