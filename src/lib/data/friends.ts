import type { SupabaseClient } from "@supabase/supabase-js";

import { usernameSchema } from "@/lib/contracts/schemas";
import type { DataResult, FriendRequestView, FriendsOverview, FriendView } from "@/lib/contracts/types";
import type { Database } from "@/lib/supabase/database.types";

import { fail, failFrom, ok } from "./result";
import { signedProfileMediaUrls } from "./profile-media";

export type FriendshipRow = { id: string; requester_id: string; addressee_id: string; status: string; created_at: string; responded_at: string | null };
export type FriendProfileRow = { user_id: string; display_name: string; username: string; avatar_url: string | null; avatar_path?: string | null };

/**
 * Splits the viewer's friendship rows into friends / incoming / outgoing, joined with the other person's public profile.
 * Rows whose profile is not visible are skipped (RLS shows profiles of friends and of people in a pending request).
 */
export function friendsOverviewFromRows(viewerId: string, rows: FriendshipRow[], profiles: FriendProfileRow[]): FriendsOverview {
  const byId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const overview: FriendsOverview = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const otherId = row.requester_id === viewerId ? row.addressee_id : row.requester_id;
    const other = byId.get(otherId);
    if (!other) continue;
    const person = { friendship_id: row.id, user_id: other.user_id, display_name: other.display_name, username: other.username, avatar_url: other.avatar_url };

    if (row.status === "accepted") {
      overview.friends.push({ ...person, since: row.responded_at ?? row.created_at } satisfies FriendView);
    } else {
      const direction = row.addressee_id === viewerId ? "incoming" : "outgoing";
      overview[direction].push({ ...person, direction, created_at: row.created_at } satisfies FriendRequestView);
    }
  }

  const byName = (a: { display_name: string }, b: { display_name: string }) => a.display_name.localeCompare(b.display_name);
  overview.friends.sort(byName);
  overview.incoming.sort((a, b) => b.created_at.localeCompare(a.created_at));
  overview.outgoing.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return overview;
}

const FRIEND_MESSAGES = {
  NOT_FOUND: "We could not find anyone with that username.",
  VALIDATION_ERROR: "That is your own username.",
  CONFLICT: "You are already friends, or a request is already waiting.",
} as const;

export async function listFriends(client: SupabaseClient<Database>, viewerId: string): Promise<DataResult<FriendsOverview>> {
  const { data: rows, error } = await client.from("friendships").select("id, requester_id, addressee_id, status, created_at, responded_at");
  if (error) return failFrom(error);
  const otherIds = [...new Set(rows.map((row) => (row.requester_id === viewerId ? row.addressee_id : row.requester_id)))];
  if (otherIds.length === 0) return ok({ friends: [], incoming: [], outgoing: [] });

  let { data: profiles, error: profileError } = await client.from("profiles").select("user_id, display_name, username, avatar_url, avatar_path").in("user_id", otherIds);
  if (profileError?.code === "42703" && /avatar_path/.test(profileError.message)) {
    ({ data: profiles, error: profileError } = (await client.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", otherIds)) as unknown as { data: typeof profiles; error: typeof profileError });
  }
  if (profileError) return failFrom(profileError);
  const visibleProfiles = profiles ?? [];
  const urls = await signedProfileMediaUrls(client, visibleProfiles.map((profile) => profile.avatar_path));
  const resolved = visibleProfiles.map((profile) => ({ ...profile, avatar_url: (profile.avatar_path && urls.get(profile.avatar_path)) || profile.avatar_url }));
  return ok(friendsOverviewFromRows(viewerId, rows, resolved));
}

export async function sendFriendRequest(client: SupabaseClient<Database>, username: string): Promise<DataResult<{ friendship_id: string; status: "pending" | "accepted" }>> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Please check the username.", { field_errors: { username: [parsed.error.issues[0]?.message ?? "Invalid"] } });

  const { data, error } = await client.rpc("send_friend_request", { p_username: parsed.data });
  if (error) {
    const result = failFrom<never>(error);
    if (!result.ok && result.error.code in FRIEND_MESSAGES) {
      return fail(result.error.code, FRIEND_MESSAGES[result.error.code as keyof typeof FRIEND_MESSAGES]);
    }
    return result;
  }
  const payload = data as { friendship_id: string; status: "pending" | "accepted" };
  return ok({ friendship_id: payload.friendship_id, status: payload.status });
}

export async function respondFriendRequest(client: SupabaseClient<Database>, friendshipId: string, accept: boolean): Promise<DataResult<{ friendship_id: string }>> {
  const { data, error } = await client.rpc("respond_friend_request", { p_friendship_id: friendshipId, p_accept: accept });
  if (error) return failFrom(error);
  return ok({ friendship_id: data as string });
}

export async function removeFriend(client: SupabaseClient<Database>, friendshipId: string): Promise<DataResult<{ friendship_id: string }>> {
  const { data, error } = await client.rpc("remove_friendship", { p_friendship_id: friendshipId });
  if (error) return failFrom(error);
  return ok({ friendship_id: data as string });
}
