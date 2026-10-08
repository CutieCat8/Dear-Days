import { demoMuseumMemories, demoMuseumTags } from "./demo-museum";
import type { Memory, MemoryInput, Room, RoomMembership, Tag } from "./types";

const ROOM_ID = "10000000-0000-4000-8000-000000000001";
const OWNER_ID = "20000000-0000-4000-8000-000000000001";
const MEMBER_ID = "20000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-09-01T08:00:00.000Z";

export const mockRooms = [
  {
    id: ROOM_ID,
    owner_id: OWNER_ID,
    name: "University Days",
    life_period: "Aug 2026 – May 2027",
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

// Mock-mode tags and memories for the room live in demo-museum.ts (18 memories: 15 photo + 3 text-only).
export const mockTags: Tag[] = demoMuseumTags;

export const mockMemories: Memory[] = demoMuseumMemories;

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
