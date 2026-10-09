import { mockCurrentProfile, mockMemberships, mockMemories, mockProfiles, mockRooms, mockTags } from "@/lib/contracts/fixtures";
import type { Memory, Profile, Room, RoomMembership, Tag } from "@/lib/contracts/types";

// In-memory database for mock mode. Seeded from fixtures, mutated by the data functions, and kept on
// globalThis so it survives dev hot reloads. Restarting `npm run dev` resets it.
// TODO(R6): delete this file once every data function reads Supabase.
type MockDb = {
  currentUserId: string;
  profiles: Profile[];
  rooms: Room[];
  memberships: RoomMembership[];
  memories: Memory[];
  tags: Tag[];
};

const globalStore = globalThis as typeof globalThis & { __dearDaysMockDb?: MockDb };

export function mockDb(): MockDb {
  globalStore.__dearDaysMockDb ??= structuredClone({
    currentUserId: mockCurrentProfile.id,
    profiles: mockProfiles,
    rooms: mockRooms,
    memberships: mockMemberships,
    memories: mockMemories,
    tags: mockTags,
  });
  return globalStore.__dearDaysMockDb;
}

export function nowIso() {
  return new Date().toISOString();
}
