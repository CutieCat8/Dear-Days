import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { dataMode } from "./config";
import { MockDataSource } from "./mock-source";
import { mockCurrentProfile, mockRoomMembers } from "@/lib/contracts/fixtures";
import type { RoomMemberView } from "@/lib/contracts/types";

import { getMyAccount, listRoomMembers, type Account } from "./profile";
import { SupabaseDataSource } from "./supabase-source";

/** Data source for Server Components / route handlers: the real database, or demo data when explicitly configured. */
export async function getDataSource(): Promise<DearDaysDataSource> {
  if (dataMode() === "mock") return new MockDataSource();
  return new SupabaseDataSource(await createSupabaseServerClient());
}

/** The signed-in person. In demo mode there is no sign-in and the fixture profile is returned. */
export async function getViewer(): Promise<Account | null> {
  if (dataMode() === "mock") return { ...mockCurrentProfile, email: null, bio: null };
  const result = await getMyAccount(await createSupabaseServerClient());
  return result.ok ? result.data : null;
}

/** Members (public profile data) per room; demo mode returns the fixture members. */
export async function getRoomMembers(roomIds: string[]) {
  if (dataMode() === "mock") {
    const map = new Map<string, RoomMemberView[]>();
    for (const id of roomIds) map.set(id, mockRoomMembers.filter((member) => member.room_id === id));
    return { ok: true as const, data: map };
  }
  return listRoomMembers(await createSupabaseServerClient(), roomIds);
}
