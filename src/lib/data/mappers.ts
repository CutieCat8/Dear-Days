import { memorySchema, roomSchema, tagSchema } from "@/lib/contracts/schemas";
import type { Memory, MemoryMedia, Room, Tag } from "@/lib/contracts/types";

/** Row shapes as PostgREST returns them (snake_case, same names as the contract). */
export type RoomRow = {
  id: string;
  owner_id: string;
  name: string;
  life_period: string;
  theme: string;
  invite_code: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
};

export type TagRow = { id: string; room_id: string; type: string; label: string; created_at: string };

export type MediaRow = {
  id: string;
  memory_id: string;
  storage_path: string;
  alt_text: string;
  mime_type: string;
  size_bytes: number;
  position: number;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  room_id: string;
  author_id: string;
  title: string;
  body: string;
  memory_date: string;
  mood: string | null;
  period_label: string | null;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
  memory_media?: MediaRow[] | null;
  memory_tags?: { tags: TagRow | null }[] | null;
};

/** The select used everywhere a full memory is needed: media rows + attached tags in one round trip. */
export const MEMORY_SELECT = "*, memory_media!memory_media_memory_id_fkey(*), memory_tags(tags(*))";

export function roomFromRow(row: RoomRow, memberCount?: number): Room {
  return roomSchema.parse({ ...row, member_count: row.member_count ?? memberCount ?? 1 });
}

export function tagFromRow(row: TagRow): Tag {
  return tagSchema.parse(row);
}

/** signedUrls maps storage_path -> short-lived URL. Only paths are stored in the database; never a URL. */
export function memoryFromRow(row: MemoryRow, signedUrls: Map<string, string>): Memory {
  const media: MemoryMedia[] = [...(row.memory_media ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({ ...item, signed_url: signedUrls.get(item.storage_path) ?? null })) as MemoryMedia[];
  const tags = (row.memory_tags ?? [])
    .map((link) => link.tags)
    .filter((tag): tag is TagRow => tag !== null)
    .sort((a, b) => a.label.localeCompare(b.label)) as Tag[];

  const { memory_media: _media, memory_tags: _tags, ...base } = row;
  void _media;
  void _tags;
  return memorySchema.parse({ ...base, media, tags });
}

export function mediaPaths(rows: MemoryRow[]): string[] {
  return rows.flatMap((row) => (row.memory_media ?? []).map((item) => item.storage_path));
}
