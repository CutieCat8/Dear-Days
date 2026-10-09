import { MEDIA_CONSTRAINTS } from "@/lib/contracts/constants";
import { memoryInputSchema, memoryListParamsSchema, tagInputSchema } from "@/lib/contracts/schemas";
import type {
  DataResult,
  MediaMutation,
  Memory,
  MemoryInput,
  MemoryListParams,
  MemoryMedia,
  NewMediaUpload,
  Paginated,
  Tag,
  TagInput,
} from "@/lib/contracts/types";

import { mockDb, nowIso } from "./mock-store";
import { fail, ok, validationFailure } from "./result";
import { getSessionUserId, isRoomMember } from "./session";

// Mock implementations of the Memory/Tag part of DearDaysDataSource (R6/R7 owner: จิรวัฒน์).
// Each function checks the session and membership itself, exactly as the Supabase version must.
// TODO(R6/R7): replace the mockDb() reads/writes with Supabase queries; keep signatures and error codes.

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function requireMember(roomId: string): Promise<DataResult<string>> {
  const userId = await getSessionUserId();
  if (!userId) return fail("UNAUTHENTICATED", "Please sign in.");
  if (!mockDb().rooms.some((room) => room.id === roomId)) return fail("NOT_FOUND", "Room not found.");
  if (!isRoomMember(roomId, userId)) return fail("FORBIDDEN", "You are not a member of this room.");
  return ok(userId);
}

function sortMedia(memory: Memory): Memory {
  return { ...memory, media: [...memory.media].sort((a, b) => a.position - b.position) };
}

export async function listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>> {
  const parsed = memoryListParamsSchema.safeParse(params);
  if (!parsed.success) return validationFailure(parsed.error);
  const { room_id, query, date_from, date_to, moods, person_tag_ids, place_tag_ids, period_label, page, page_size, sort } = parsed.data;

  const member = await requireMember(room_id);
  if (!member.ok) return member;

  const needle = query?.toLowerCase();
  const hasTag = (memory: Memory, ids?: string[]) => !ids?.length || memory.tags.some((tag) => ids.includes(tag.id));
  const filtered = mockDb().memories.filter((memory) =>
    memory.room_id === room_id &&
    (!needle || memory.title.toLowerCase().includes(needle) || memory.body.toLowerCase().includes(needle)) &&
    (!date_from || memory.memory_date >= date_from) &&
    (!date_to || memory.memory_date <= date_to) &&
    (!moods?.length || moods.includes(memory.mood)) &&
    hasTag(memory, person_tag_ids) &&
    hasTag(memory, place_tag_ids) &&
    (!period_label || memory.period_label === period_label),
  );
  filtered.sort((a, b) =>
    sort === "memory_date_asc" ? a.memory_date.localeCompare(b.memory_date)
      : sort === "updated_at_desc" ? b.updated_at.localeCompare(a.updated_at)
        : b.memory_date.localeCompare(a.memory_date),
  );

  const start = (page - 1) * page_size;
  const items = filtered.slice(start, start + page_size).map((memory) => structuredClone(sortMedia(memory)));
  return ok({ items, page, page_size, total: filtered.length, has_more: start + page_size < filtered.length });
}

export async function getMemory(roomId: string, memoryId: string): Promise<DataResult<Memory>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  const memory = mockDb().memories.find((item) => item.id === memoryId && item.room_id === roomId);
  return memory ? ok(structuredClone(sortMedia(memory))) : fail("NOT_FOUND", "Memory not found.");
}

export async function listTags(roomId: string): Promise<DataResult<Tag[]>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  return ok(structuredClone(mockDb().tags.filter((tag) => tag.room_id === roomId)));
}

// Supabase: insert ... on conflict (room_id, type, lower(label)) do nothing, then select the rows.
export async function upsertTags(roomId: string, inputs: TagInput[]): Promise<DataResult<Tag[]>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  const parsed = tagInputSchema.array().safeParse(inputs);
  if (!parsed.success) return validationFailure(parsed.error);

  const db = mockDb();
  const result: Tag[] = [];
  for (const input of parsed.data) {
    let tag = db.tags.find((item) => item.room_id === roomId && item.type === input.type && item.label.toLowerCase() === input.label.toLowerCase());
    if (!tag) {
      tag = { id: crypto.randomUUID(), room_id: roomId, type: input.type, label: input.label, created_at: nowIso() };
      db.tags.push(tag);
    }
    if (!result.some((item) => item.id === tag.id)) result.push(tag);
  }
  return ok(structuredClone(result));
}

/**
 * Re-checks every uploaded file against its `added` metadata (never trust the browser's MIME/size) and
 * builds the final ordered media list. Mock mode keeps image bytes as data URLs in place of Storage.
 * TODO(R7): upload to the private `memory-media` bucket at `{room_id}/{memory_id}/{media_id}.{ext}`,
 * insert memory_media rows, return signed URLs, and remove uploaded objects if any later step fails.
 */
async function applyMediaPlan(roomId: string, memoryId: string, plan: MediaMutation, current: MemoryMedia[], uploads: NewMediaUpload[]): Promise<DataResult<{ media: MemoryMedia[]; coverId: string | null }>> {
  const unknownExisting = plan.existing.find((item) => !current.some((media) => media.id === item.id));
  const unknownRemoved = plan.removed_media_ids.find((id) => !current.some((media) => media.id === id));
  if (unknownExisting || unknownRemoved) return fail("VALIDATION_ERROR", "Photos must belong to this memory.", { field_errors: { media: ["Photos must belong to this memory."] } });

  const uploadsById = new Map(uploads.map((upload) => [upload.client_id, upload]));
  if (uploadsById.size !== plan.added.length || plan.added.some((item) => !uploadsById.has(item.client_id))) {
    return fail("UPLOAD_FAILED", "Some photos did not arrive. Please try again.", { retryable: true });
  }

  const created = new Map<string, MemoryMedia>();
  for (const meta of plan.added) {
    const file = uploadsById.get(meta.client_id)!.file;
    if (!(MEDIA_CONSTRAINTS.acceptedMimeTypes as readonly string[]).includes(file.type) || file.type !== meta.mime_type) {
      return fail("VALIDATION_ERROR", "Only JPEG, PNG and WebP photos are supported.", { field_errors: { media: ["Only JPEG, PNG and WebP photos are supported."] } });
    }
    if (file.size <= 0 || file.size > MEDIA_CONSTRAINTS.maxFileBytes || file.size !== meta.size_bytes) {
      return fail("VALIDATION_ERROR", "Each photo must be 10 MB or smaller.", { field_errors: { media: ["Each photo must be 10 MB or smaller."] } });
    }
    const id = crypto.randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    created.set(meta.client_id, {
      id,
      memory_id: memoryId,
      storage_path: `${roomId}/${memoryId}/${id}.${EXTENSIONS[file.type]}`,
      signed_url: `data:${file.type};base64,${bytes}`,
      alt_text: meta.alt_text,
      mime_type: meta.mime_type,
      size_bytes: meta.size_bytes,
      position: 0,
      created_at: nowIso(),
    });
  }

  const altById = new Map(plan.existing.map((item) => [item.id, item.alt_text]));
  const resolve = (ref: MediaMutation["order"][number]) => ref.kind === "existing" ? current.find((media) => media.id === ref.id) : created.get(ref.client_id);
  const media = plan.order.map((ref, position) => {
    const item = resolve(ref)!;
    return { ...item, position, alt_text: ref.kind === "existing" ? altById.get(ref.id) ?? item.alt_text : item.alt_text };
  });
  const coverId = plan.cover ? resolve(plan.cover)?.id ?? null : media[0]?.id ?? null;
  return ok({ media, coverId });
}

export async function createMemory(roomId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  const parsed = memoryInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { tags: tagInputs, media: plan, ...fields } = parsed.data;

  const id = crypto.randomUUID();
  const mediaResult = await applyMediaPlan(roomId, id, plan, [], uploads);
  if (!mediaResult.ok) return mediaResult;
  const tags = await upsertTags(roomId, tagInputs);
  if (!tags.ok) return tags;

  const now = nowIso();
  // author_id always comes from the session, never from the form.
  const memory: Memory = { id, room_id: roomId, author_id: member.data, ...fields, cover_media_id: mediaResult.data.coverId, created_at: now, updated_at: now, media: mediaResult.data.media, tags: tags.data };
  mockDb().memories.push(memory);
  return ok(structuredClone(memory));
}

export async function updateMemory(roomId: string, memoryId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  const memory = mockDb().memories.find((item) => item.id === memoryId && item.room_id === roomId);
  if (!memory) return fail("NOT_FOUND", "Memory not found.");
  if (memory.author_id !== member.data) return fail("FORBIDDEN", "Only the author can edit this memory.");
  const parsed = memoryInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { tags: tagInputs, media: plan, ...fields } = parsed.data;

  const mediaResult = await applyMediaPlan(roomId, memoryId, plan, memory.media, uploads);
  if (!mediaResult.ok) return mediaResult;
  const tags = await upsertTags(roomId, tagInputs);
  if (!tags.ok) return tags;

  // TODO(R7): delete Storage objects for media dropped from the plan.
  Object.assign(memory, fields, { cover_media_id: mediaResult.data.coverId, media: mediaResult.data.media, tags: tags.data, updated_at: nowIso() });
  return ok(structuredClone(memory));
}

export async function deleteMemory(roomId: string, memoryId: string): Promise<DataResult<{ id: string }>> {
  const member = await requireMember(roomId);
  if (!member.ok) return member;
  const db = mockDb();
  const index = db.memories.findIndex((item) => item.id === memoryId && item.room_id === roomId);
  if (index === -1) return fail("NOT_FOUND", "Memory not found.");
  if (db.memories[index].author_id !== member.data) return fail("FORBIDDEN", "Only the author can delete this memory.");
  // TODO(R7): delete the memory's Storage objects after the row is removed.
  db.memories.splice(index, 1);
  return ok({ id: memoryId });
}
