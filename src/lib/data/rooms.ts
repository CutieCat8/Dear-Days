import type { DataResult, Room } from "@/lib/contracts/types";

import { mockDb } from "./mock-store";
import { fail, ok } from "./result";
import { getSessionUserId, isRoomMember } from "./session";

// Read-only room lookups so memory/profile pages stop importing fixtures.
// Owned by R9 (สิรวิชญ์): replace with the real listRooms/getRoom implementation, same signatures.

export async function listRooms(): Promise<DataResult<Room[]>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  return ok(structuredClone(mockDb().rooms.filter((room) => isRoomMember(room.id, userId))));
}

export async function getRoom(roomId: string): Promise<DataResult<Room>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  const room = mockDb().rooms.find((item) => item.id === roomId);
  if (!room) return fail("NOT_FOUND", "Room not found.");
  if (!isRoomMember(roomId, userId)) return fail("FORBIDDEN", "You are not a member of this room.");
  return ok(structuredClone(room));
}
