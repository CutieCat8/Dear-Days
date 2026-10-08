import type { Memory, MemoryInput, MemoryMedia, Mood, Room, RoomMembership, Tag } from "./types";

const ROOM_ID = "10000000-0000-4000-8000-000000000001";
const OWNER_ID = "20000000-0000-4000-8000-000000000001";
const MEMBER_ID = "20000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-09-01T08:00:00.000Z";

export const mockRooms = [
  {
    id: ROOM_ID,
    owner_id: OWNER_ID,
    name: "วันธรรมดาของเรา",
    life_period: "มหาวิทยาลัย ปี 1",
    theme: "sunrise",
    invite_code: "DAY26001",
    member_count: 2,
    created_at: CREATED_AT,
    updated_at: "2026-10-07T12:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    owner_id: OWNER_ID,
    name: "เชียงใหม่ครั้งแรก",
    life_period: "ตุลาคม 2026",
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

export const mockTags = [
  { id: "30000000-0000-4000-8000-000000000001", room_id: ROOM_ID, type: "person", label: "ซี", created_at: CREATED_AT },
  { id: "30000000-0000-4000-8000-000000000002", room_id: ROOM_ID, type: "person", label: "เพื่อนกลุ่มโปรเจกต์", created_at: CREATED_AT },
  { id: "30000000-0000-4000-8000-000000000003", room_id: ROOM_ID, type: "place", label: "มหาวิทยาลัย", created_at: CREATED_AT },
  { id: "30000000-0000-4000-8000-000000000004", room_id: ROOM_ID, type: "place", label: "เชียงใหม่", created_at: CREATED_AT },
] satisfies Tag[];

function media(memoryNumber: number, mediaNumber: number, position: number): MemoryMedia {
  const memoryId = `40000000-0000-4000-8000-${String(memoryNumber).padStart(12, "0")}`;
  return {
    id: `50000000-0000-4000-8000-${String(memoryNumber * 10 + mediaNumber).padStart(12, "0")}`,
    memory_id: memoryId,
    storage_path: `${ROOM_ID}/${memoryId}/photo-${mediaNumber}.webp`,
    signed_url: `/mock/memory-${memoryNumber}-${mediaNumber}.svg`,
    alt_text: `ภาพประกอบความทรงจำลำดับที่ ${mediaNumber}`,
    mime_type: "image/webp",
    size_bytes: 180_000 + mediaNumber,
    position,
    created_at: "2026-10-01T10:00:00.000Z",
  };
}

function memory(number: number, mood: Mood | null, options?: { mediaCount?: number; authorId?: string }): Memory {
  const id = `40000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  const mediaItems = Array.from({ length: options?.mediaCount ?? 0 }, (_, index) => media(number, index + 1, index));
  const moodTitle = mood === null ? "วันที่เรียบง่าย" : `ความทรงจำ: ${mood}`;

  return {
    id,
    room_id: ROOM_ID,
    author_id: options?.authorId ?? OWNER_ID,
    title: moodTitle,
    body: number === 7
      ? "วันนี้ไม่มีรูป แต่อยากเก็บข้อความสั้น ๆ นี้ไว้กลับมาอ่านในอนาคต"
      : "เรื่องเล่าตัวอย่างสำหรับพัฒนา card, detail และตัวกรองด้วยข้อมูลรูปแบบเดียวกัน",
    memory_date: `2026-09-${String(number + 9).padStart(2, "0")}`,
    mood,
    period_label: "มหาวิทยาลัย ปี 1",
    cover_media_id: mediaItems[0]?.id ?? null,
    created_at: `2026-09-${String(number + 9).padStart(2, "0")}T10:00:00.000Z`,
    updated_at: `2026-09-${String(number + 9).padStart(2, "0")}T10:00:00.000Z`,
    media: mediaItems,
    tags: number % 2 === 0 ? [mockTags[1], mockTags[2]] : [mockTags[0]],
  };
}

export const mockMemories = [
  memory(1, "awful"),
  memory(2, "stressed"),
  memory(3, "sad"),
  memory(4, "relaxed", { mediaCount: 1, authorId: MEMBER_ID }),
  memory(5, "happy", { mediaCount: 2 }),
  memory(6, "excited", { mediaCount: 3, authorId: MEMBER_ID }),
  memory(7, null),
] satisfies Memory[];

export const mockMemoryCreateInput = {
  title: "เย็นวันศุกร์",
  body: "เดินกลับหอพร้อมกันและแวะซื้อไอศกรีม",
  memory_date: "2026-10-02",
  mood: "relaxed",
  period_label: "มหาวิทยาลัย ปี 1",
  tags: [
    { type: "person", label: "เพื่อนกลุ่มโปรเจกต์" },
    { type: "place", label: "มหาวิทยาลัย" },
  ],
  media: {
    existing: [],
    added: [],
    removed_media_ids: [],
    order: [],
    cover: null,
  },
} satisfies MemoryInput;
