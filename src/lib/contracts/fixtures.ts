import { demoMuseumMemories, demoMuseumTags } from "./demo-museum";
import type { FriendsOverview, Memory, MemoryInput, Profile, Room, RoomMemberView, RoomMembership, Tag } from "./types";

const ROOM_ID = "10000000-0000-4000-8000-000000000001";
const OWNER_ID = "20000000-0000-4000-8000-000000000001";
const MEMBER_ID = "20000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-09-01T08:00:00.000Z";

export const mockProfiles = [
  { id: OWNER_ID, display_name: "Pim", avatar_url: null, created_at: "2026-08-30T08:00:00.000Z", updated_at: "2026-08-30T08:00:00.000Z" },
  { id: MEMBER_ID, display_name: "Mint", avatar_url: null, created_at: "2026-09-02T07:30:00.000Z", updated_at: "2026-09-02T07:30:00.000Z" },
] satisfies Profile[];

export const mockCurrentProfile: Profile = mockProfiles[0];

/** Usernames for demo mode (the contract `Profile` has none; it lives on the account and on friend views). */
export const mockUsernames: Record<string, string> = { [OWNER_ID]: "pim.days", [MEMBER_ID]: "mint.days" };

export const mockFriends = {
  friends: [
    { friendship_id: "60000000-0000-4000-8000-000000000003", user_id: "20000000-0000-4000-8000-000000000003", display_name: "James", username: "james.diary", avatar_url: null, since: "2026-09-12T10:00:00.000Z" },
    { friendship_id: "60000000-0000-4000-8000-000000000002", user_id: MEMBER_ID, display_name: "Mint", username: "mint.days", avatar_url: null, since: "2026-09-02T07:00:00.000Z" },
  ],
  incoming: [
    { friendship_id: "60000000-0000-4000-8000-000000000004", user_id: "20000000-0000-4000-8000-000000000004", display_name: "Ploy", username: "ploy.memories", avatar_url: null, direction: "incoming", created_at: "2026-10-08T09:30:00.000Z" },
  ],
  outgoing: [],
} satisfies FriendsOverview;

export const mockRooms = [
  {
    id: ROOM_ID,
    owner_id: OWNER_ID,
    name: "University Days",
    life_period: "Aug 2026 – May 2027",
    description: "Our first year at university, one small day at a time.",
    theme: "sunrise",
    invite_code: "DAY26001",
    member_count: 2,
    created_at: CREATED_AT,
    updated_at: "2026-10-07T12:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    owner_id: OWNER_ID,
    name: "Little Adventures",
    life_period: "October 2026",
    description: null,
    theme: "night",
    invite_code: "CNX26001",
    member_count: 1,
    created_at: "2026-10-01T08:00:00.000Z",
    updated_at: "2026-10-01T08:00:00.000Z",
  },
] satisfies Room[];

export const mockMemberships = [
  { room_id: ROOM_ID, user_id: OWNER_ID, role: "owner", joined_at: CREATED_AT },
  { room_id: ROOM_ID, user_id: MEMBER_ID, role: "member", joined_at: "2026-09-02T08:00:00.000Z" },
] satisfies RoomMembership[];

export const mockRoomMembers = mockMemberships.map((membership) => {
  const profile = mockProfiles.find((item) => item.id === membership.user_id)!;
  return { ...membership, display_name: profile.display_name, avatar_url: profile.avatar_url };
}) satisfies RoomMemberView[];

// Mock-mode tags and memories for the room live in demo-museum.ts (18 memories: 15 photo + 3 text-only).
export const mockTags: Tag[] = demoMuseumTags;

export const mockMemories: Memory[] = demoMuseumMemories;

/** Demo-mode Highlights of the signed-in demo person (read-only, like everything else in demo mode). */
export const mockFavoriteMemoryIds: string[] = [1, 5, 9, 12].map((n) => `41000000-0000-4000-8000-${String(n).padStart(12, "0")}`);

export const mockMemoryCreateInput = {
  title: "Friday evening",
  body: "We walked back to the dorm together and stopped for ice cream.",
  memory_date: "2026-10-02",
  mood: "relaxed",
  period_label: "University Year 1",
  tags: [
    { type: "person", label: "Mint" },
    { type: "place", label: "Chiang Mai University" },
  ],
  media: {
    existing: [],
    added: [],
    removed_media_ids: [],
    order: [],
    cover: null,
  },
} satisfies MemoryInput;
