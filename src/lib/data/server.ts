import { cache } from "react";

import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { dataMode } from "./config";
import { MockDataSource } from "./mock-source";
import { mockCurrentProfile, mockRoomMembers, mockUsernames } from "@/lib/contracts/fixtures";
import type { RoomMemberView } from "@/lib/contracts/types";

import { getMyAccount, listRoomMembers, type Account } from "./profile";
import { SupabaseDataSource } from "./supabase-source";
import { viewerFromResult } from "./viewer";

/** Data source for Server Components / route handlers: the real database, or demo data when explicitly configured. */
export const getDataSource = cache(async (): Promise<DearDaysDataSource> => {
  if (dataMode() === "mock") return new MockDataSource();
  return new SupabaseDataSource(await getServerClient());
});

// One Supabase client per request, shared by the layout and the page (cache() lasts for one server render):
// the session check is reused and the same profile is not fetched twice.
const getServerClient = cache(() => createSupabaseServerClient());

/** The signed-in person. In demo mode there is no sign-in and the fixture profile is returned. */
export const getViewer = cache(async (): Promise<Account | null> => {
  if (dataMode() === "mock") return { ...mockCurrentProfile, email: null, bio: null, username: mockUsernames[mockCurrentProfile.id] ?? null };
  return viewerFromResult(await getMyAccount(await getServerClient()));
});

/** Members (public profile data) per room; demo mode returns the fixture members. */
export async function getRoomMembers(roomIds: string[]) {
  if (dataMode() === "mock") {
    const map = new Map<string, RoomMemberView[]>();
    for (const id of roomIds) map.set(id, mockRoomMembers.filter((member) => member.room_id === id));
    return { ok: true as const, data: map };
  }
  return listRoomMembers(await getServerClient(), roomIds);
}
