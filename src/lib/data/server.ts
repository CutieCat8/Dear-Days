import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { dataMode } from "./config";
import { MockDataSource } from "./mock-source";
import { getMyProfile, listRoomMembers, type Profile } from "./profile";
import { SupabaseDataSource } from "./supabase-source";

/** Data source for Server Components / route handlers: the real database, or demo data when explicitly configured. */
export async function getDataSource(): Promise<DearDaysDataSource> {
  if (dataMode() === "mock") return new MockDataSource();
  return new SupabaseDataSource(await createSupabaseServerClient());
}

/** The signed-in person. In demo mode there is no sign-in and a fixed demo viewer is returned. */
export async function getViewer(): Promise<Profile | null> {
  if (dataMode() === "mock") {
    return { user_id: "20000000-0000-4000-8000-000000000001", email: null, display_name: "Sea", bio: null };
  }
  const result = await getMyProfile(await createSupabaseServerClient());
  return result.ok ? result.data : null;
}

/** Members with display names per room (demo mode returns Sea + Mint as in the fixtures). */
export async function getRoomMembers(roomIds: string[]) {
  if (dataMode() === "mock") {
    const map = new Map<string, { user_id: string; role: "owner" | "member"; display_name: string }[]>();
    for (const id of roomIds) {
      map.set(id, [
        { user_id: "20000000-0000-4000-8000-000000000001", role: "owner", display_name: "Sea" },
        { user_id: "20000000-0000-4000-8000-000000000002", role: "member", display_name: "Mint" },
      ]);
    }
    return { ok: true as const, data: map };
  }
  return listRoomMembers(await createSupabaseServerClient(), roomIds);
}
