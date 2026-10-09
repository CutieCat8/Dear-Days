import { mockDb } from "./mock-store";

/**
 * The signed-in user's id, taken from the server session — never from the browser.
 * TODO(R6): when the data layer reads Supabase, return
 *   (await (await createSupabaseServerClient()).auth.getClaims()).data?.claims.sub ?? null
 * Until then the mock store's current user (the fixture owner) is always signed in.
 */
export async function getSessionUserId(): Promise<string | null> {
  return mockDb().currentUserId;
}

/**
 * Email of the signed-in user. Email lives in Supabase Auth, not in `profiles`, and is shown only to its owner.
 * TODO(R6): return `claims.email` from `auth.getClaims()`.
 */
export async function getSessionEmail(): Promise<string | null> {
  return mockDb().currentUserEmail;
}

/** Owner or member of the room. Room membership data is owned by R9; this read-only check is shared. */
export function isRoomMember(roomId: string, userId: string) {
  const db = mockDb();
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return false;
  return room.owner_id === userId || db.memberships.some((item) => item.room_id === roomId && item.user_id === userId);
}
