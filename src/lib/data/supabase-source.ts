import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { memoryInputSchema, memoryListParamsSchema, profileInputSchema, roomInputSchema, tagInputSchema } from "@/lib/contracts/schemas";
import type { DataResult, FrameAssignment, FriendsOverview, Memory, MemoryInput, MemoryListParams, NewMediaUpload, Paginated, Profile, ProfileInput, Room, RoomInput, RoomMemberView, Tag, TagInput } from "@/lib/contracts/types";

import { listFriends, removeFriend, respondFriendRequest, sendFriendRequest } from "./friends";
import { MEMORY_SELECT, mediaPaths, memoryFromRow, roomFromRow, tagFromRow, type MemoryRow, type RoomRow, type TagRow } from "./mappers";
import { MEMORY_BUCKET, planMemorySave } from "./memory-payload";
import { getCurrentProfile, listRoomMembers, updateMyAccount } from "./profile";
import { getSessionUser } from "./session";
import { fail, failFrom, ok } from "./result";

/** Lifetime of a signed photo URL. Only the storage path is persisted; URLs are made on every read. */
export const SIGNED_URL_SECONDS = 60 * 60;
/** Remove at most this many objects per Storage call. */
const REMOVE_CHUNK = 100;
/** Favourite ids read per request, and memories loaded per request when opening the Highlights book. */
const FAVORITE_PAGE = 500;
const FAVORITE_CHUNK = 100;

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function validationFailed<T>(error: { issues: { path: PropertyKey[]; message: string }[] }): DataResult<T> {
  return fail("VALIDATION_ERROR", "Please check the highlighted fields.", { field_errors: fieldErrors(error) });
}

/**
 * Real implementation of the data contract on top of Supabase (Auth + Postgres + private Storage).
 * Works with a server client (Server Components, route handlers) and with the browser client (forms that upload photos).
 * Authorisation is enforced twice: here (session required, clear error codes) and in the database (RLS + RPC checks).
 * There is no fallback to demo data: a failed query is returned as an error.
 */
export class SupabaseDataSource implements DearDaysDataSource {
  constructor(private readonly client: SupabaseClient<Database>) {}

  // -------------------------------------------------------------- session

  private async userId(): Promise<string | null> {
    return (await getSessionUser(this.client))?.id ?? null;
  }

  // -------------------------------------------------------------- profile

  getCurrentProfile(): Promise<DataResult<Profile>> {
    return getCurrentProfile(this.client);
  }

  async updateProfile(input: ProfileInput): Promise<DataResult<Profile>> {
    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) return validationFailed(parsed.error);
    const result = await updateMyAccount(this.client, { display_name: parsed.data.display_name });
    if (!result.ok) return result;
    return getCurrentProfile(this.client);
  }

  // -------------------------------------------------------------- rooms

  async listRooms(): Promise<DataResult<Room[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.from("room_summaries").select("*").order("created_at", { ascending: false });
    if (error) return failFrom(error);
    return ok((data as RoomRow[]).map((row) => roomFromRow(row)));
  }

  async getRoom(roomId: string): Promise<DataResult<Room>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.from("room_summaries").select("*").eq("id", roomId).maybeSingle();
    if (error) return failFrom(error);
    // A room you are not in is indistinguishable from a missing one (RLS): never confirm that a private room exists.
    if (!data) return fail("NOT_FOUND", "We could not find that room.");
    return ok(roomFromRow(data as RoomRow));
  }

  async createRoom(input: RoomInput): Promise<DataResult<Room>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const parsed = roomInputSchema.safeParse(input);
    if (!parsed.success) return validationFailed(parsed.error);
    const { data, error } = await this.client.rpc("create_room", { p_name: parsed.data.name, p_life_period: parsed.data.life_period, p_theme: parsed.data.theme, p_description: parsed.data.description ?? undefined });
    if (error) return failFrom(error);
    return ok(roomFromRow(data as RoomRow, 1));
  }

  async updateRoom(roomId: string, input: Partial<RoomInput>): Promise<DataResult<Room>> {
    const userId = await this.userId();
    if (!userId) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const parsed = roomInputSchema.partial().safeParse(input);
    if (!parsed.success) return validationFailed(parsed.error);

    const current = await this.getRoom(roomId);
    if (!current.ok) return current;
    if (current.data.owner_id !== userId) return fail("FORBIDDEN", "Only the room owner can change the room.");

    const changes = { ...parsed.data, ...(parsed.data.description !== undefined ? { description: parsed.data.description?.length ? parsed.data.description : null } : {}) };
    const { data, error } = await this.client.from("rooms").update(changes).eq("id", roomId).select("id");
    if (error) return failFrom(error);
    if (!data || data.length === 0) return fail("FORBIDDEN", "Only the room owner can change the room.");
    return this.getRoom(roomId);
  }

  async deleteRoom(roomId: string): Promise<DataResult<{ id: string }>> {
    const userId = await this.userId();
    if (!userId) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const current = await this.getRoom(roomId);
    if (!current.ok) return current;
    if (current.data.owner_id !== userId) return fail("FORBIDDEN", "Only the room owner can delete the room.");

    // Storage and Postgres are not one transaction: remove the photos first (the owner may delete any object in the
    // room, but only while the room still exists), and only delete the room when that worked. A failure here leaves the
    // room intact so the user can simply retry; nothing is half-deleted.
    const { data: media, error: listError } = await this.client.from("memory_media").select("storage_path, memories!memory_media_memory_id_fkey!inner(room_id)").eq("memories.room_id", roomId);
    if (listError) return failFrom(listError);
    const removal = await this.removeObjects((media ?? []).map((row) => row.storage_path as string));
    if (!removal.ok) return fail("UPLOAD_FAILED", "The room photos could not be removed. The room was not deleted, please try again.", { retryable: true });

    const { data, error } = await this.client.from("rooms").delete().eq("id", roomId).select("id");
    if (error) return failFrom(error);
    if (!data || data.length === 0) return fail("FORBIDDEN", "Only the room owner can delete the room.");
    return ok({ id: roomId });
  }

  async joinRoom(inviteCode: string): Promise<DataResult<Room>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.rpc("join_room", { p_invite_code: inviteCode });
    if (error) return failFrom(error);
    return this.getRoom(data as string);
  }

  async listRoomMembers(roomId: string): Promise<DataResult<RoomMemberView[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const result = await listRoomMembers(this.client, [roomId]);
    if (!result.ok) return result;
    const members = result.data.get(roomId) ?? [];
    // every room has an owner, so an empty list means the caller cannot see this room (not a member, or no such room)
    if (members.length === 0) return fail("FORBIDDEN", "You are not a member of this room.");
    return ok(members);
  }

  async removeRoomMember(roomId: string, userId: string): Promise<DataResult<{ user_id: string }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.rpc("remove_room_member", { p_room_id: roomId, p_user_id: userId });
    if (error) return failFrom(error);
    return ok({ user_id: data as string });
  }

  // -------------------------------------------------------------- friends

  async listFriends(): Promise<DataResult<FriendsOverview>> {
    const userId = await this.userId();
    if (!userId) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    return listFriends(this.client, userId);
  }

  async sendFriendRequest(username: string): Promise<DataResult<{ friendship_id: string; status: "pending" | "accepted" }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    return sendFriendRequest(this.client, username);
  }

  async respondFriendRequest(friendshipId: string, accept: boolean): Promise<DataResult<{ friendship_id: string }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    return respondFriendRequest(this.client, friendshipId, accept);
  }

  async removeFriend(friendshipId: string): Promise<DataResult<{ friendship_id: string }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    return removeFriend(this.client, friendshipId);
  }

  // -------------------------------------------------------------- memories

  async listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const parsed = memoryListParamsSchema.safeParse(params);
    if (!parsed.success) return validationFailed(parsed.error);
    const p = parsed.data;

    const moods = p.moods?.filter((mood): mood is NonNullable<typeof mood> => mood !== null);
    const { data: page, error } = await this.client.rpc("list_memory_ids", {
      p_room_id: p.room_id,
      p_query: p.query ?? undefined,
      p_date_from: p.date_from ?? undefined,
      p_date_to: p.date_to ?? undefined,
      p_moods: moods && moods.length > 0 ? moods : undefined,
      p_include_no_mood: p.moods?.includes(null) ?? false,
      p_person_tag_ids: p.person_tag_ids ?? undefined,
      p_place_tag_ids: p.place_tag_ids ?? undefined,
      p_period_label: p.period_label ?? undefined,
      p_sort: p.sort,
      p_limit: p.page_size,
      p_offset: (p.page - 1) * p.page_size,
    });
    if (error) return failFrom(error);

    const rows = (page ?? []) as { id: string; total: number | string }[];
    const total = rows.length > 0 ? Number(rows[0].total) : 0;
    if (rows.length === 0) return ok({ items: [], page: p.page, page_size: p.page_size, total: p.page > 1 ? await this.countMemories(p.room_id) : 0, has_more: false });

    const ids = rows.map((row) => row.id);
    const { data, error: loadError } = await this.client.from("memories").select(MEMORY_SELECT).in("id", ids);
    if (loadError) return failFrom(loadError);
    const byId = new Map((data as unknown as MemoryRow[]).map((row) => [row.id, row]));
    const ordered = ids.map((id) => byId.get(id)).filter((row): row is MemoryRow => row !== undefined);
    const urls = await this.signedUrls(mediaPaths(ordered));
    return ok({
      items: ordered.map((row) => memoryFromRow(row, urls)),
      page: p.page,
      page_size: p.page_size,
      total,
      has_more: (p.page - 1) * p.page_size + ordered.length < total,
    });
  }

  private async countMemories(roomId: string): Promise<number> {
    const { count } = await this.client.from("memories").select("id", { count: "exact", head: true }).eq("room_id", roomId);
    return count ?? 0;
  }

  async getMemory(roomId: string, memoryId: string): Promise<DataResult<Memory>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.from("memories").select(MEMORY_SELECT).eq("id", memoryId).eq("room_id", roomId).maybeSingle();
    if (error) return failFrom(error);
    if (!data) return fail("NOT_FOUND", "We could not find that memory.");
    const row = data as unknown as MemoryRow;
    return ok(memoryFromRow(row, await this.signedUrls(mediaPaths([row]))));
  }

  createMemory(roomId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>> {
    return this.saveMemory(roomId, crypto.randomUUID(), input, uploads);
  }

  async updateMemory(roomId: string, memoryId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>> {
    const existing = await this.getMemory(roomId, memoryId);
    if (!existing.ok) return existing;
    return this.saveMemory(roomId, memoryId, input, uploads);
  }

  /**
   * Order of operations (Storage and Postgres cannot share a transaction):
   *  1. upload new photos under a path the database will accept   -> failure: remove what was uploaded, nothing saved
   *  2. save_memory RPC: memory + photos + order + cover + tags in ONE transaction -> failure: remove the new uploads
   *  3. only after success: delete the Storage objects of removed photos (best effort; old photos are never touched before)
   */
  private async saveMemory(roomId: string, memoryId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>> {
    const userId = await this.userId();
    if (!userId) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const parsed = memoryInputSchema.safeParse(input);
    if (!parsed.success) return validationFailed(parsed.error);

    const plan = planMemorySave(roomId, userId, memoryId, parsed.data, uploads);
    if ("error" in plan) return fail("VALIDATION_ERROR", plan.error);

    const uploaded: string[] = [];
    for (const item of plan.uploads) {
      const { error } = await this.client.storage.from(MEMORY_BUCKET).upload(item.path, item.file, { contentType: item.contentType, upsert: false });
      if (error) {
        await this.removeObjects(uploaded);
        return fail("UPLOAD_FAILED", "A photo could not be uploaded. Nothing was saved, please try again.", { retryable: true });
      }
      uploaded.push(item.path);
    }

    const { data, error } = await this.client.rpc("save_memory", { p_room_id: roomId, p_memory_id: memoryId, p_input: plan.payload as Json });
    if (error) {
      const cleanup = await this.removeObjects(uploaded);
      const result = failFrom<Memory>(error);
      if (!cleanup.ok && !result.ok) console.error("[dear-days] orphaned uploads after a failed save", uploaded);
      return result;
    }

    const removedPaths = ((data as { removed_paths?: string[] } | null)?.removed_paths ?? []).filter(Boolean);
    const cleanup = await this.removeObjects(removedPaths);
    if (!cleanup.ok) console.error("[dear-days] could not delete removed photos from Storage (safe to retry)", removedPaths);

    return this.getMemory(roomId, memoryId);
  }

  async deleteMemory(roomId: string, memoryId: string): Promise<DataResult<{ id: string }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const existing = await this.getMemory(roomId, memoryId);
    if (!existing.ok) return existing;

    const { data, error } = await this.client.from("memories").delete().eq("id", memoryId).eq("room_id", roomId).select("id");
    if (error) return failFrom(error);
    if (!data || data.length === 0) return fail("FORBIDDEN", "Only the author can delete this memory.");

    const cleanup = await this.removeObjects(existing.data.media.map((item) => item.storage_path));
    if (!cleanup.ok) console.error("[dear-days] could not delete photos of a deleted memory (safe to retry)", existing.data.media.map((item) => item.storage_path));
    return ok({ id: memoryId });
  }

  // -------------------------------------------------------------- tags

  async listFrameAssignments(roomId: string): Promise<DataResult<FrameAssignment[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.from("room_frame_slots").select("slot_id, memory_id").eq("room_id", roomId);
    if (error) return failFrom(error);
    return ok(data);
  }

  async setFrameLayout(roomId: string, layout: Record<string, string>): Promise<DataResult<FrameAssignment[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { error } = await this.client.rpc("set_frame_layout", { p_room_id: roomId, p_layout: layout });
    if (error) return failFrom(error);
    return ok(Object.entries(layout).map(([slot_id, memory_id]) => ({ slot_id, memory_id })));
  }

  async listFavoriteMemoryIds(roomId: string): Promise<DataResult<string[]>> {
    const userId = await this.userId();
    if (!userId) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const ids: string[] = [];
    // PostgREST caps one response (1000 rows by default): keep reading until a short page, never assume the first page is all
    for (let from = 0; ; from += FAVORITE_PAGE) {
      const { data, error } = await this.client
        .from("memory_favorites")
        .select("memory_id")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("memory_id")
        .range(from, from + FAVORITE_PAGE - 1);
      if (error) return failFrom(error);
      ids.push(...data.map((row) => row.memory_id));
      if (data.length < FAVORITE_PAGE) break;
    }
    return ok(ids);
  }

  async listFavoriteMemories(roomId: string): Promise<DataResult<Memory[]>> {
    const favorites = await this.listFavoriteMemoryIds(roomId);
    if (!favorites.ok) return favorites;
    const memories: Memory[] = [];
    for (let i = 0; i < favorites.data.length; i += FAVORITE_CHUNK) {
      const chunk = favorites.data.slice(i, i + FAVORITE_CHUNK);
      const { data, error } = await this.client.from("memories").select(MEMORY_SELECT).eq("room_id", roomId).in("id", chunk);
      if (error) return failFrom(error);
      const rows = data as unknown as MemoryRow[];
      const urls = await this.signedUrls(mediaPaths(rows));
      memories.push(...rows.map((row) => memoryFromRow(row, urls)));
    }
    memories.sort((a, b) => a.memory_date.localeCompare(b.memory_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    return ok(memories);
  }

  async setMemoryFavorite(roomId: string, memoryId: string, favorite: boolean): Promise<DataResult<{ memory_id: string; favorite: boolean }>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { error } = await this.client.rpc("set_memory_favorite", { p_room_id: roomId, p_memory_id: memoryId, p_favorite: favorite });
    if (error) return failFrom(error);
    return ok({ memory_id: memoryId, favorite });
  }

  async listTags(roomId: string): Promise<DataResult<Tag[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const { data, error } = await this.client.from("tags").select("*").eq("room_id", roomId).order("type").order("label");
    if (error) return failFrom(error);
    return ok((data as TagRow[]).map(tagFromRow));
  }

  async upsertTags(roomId: string, tags: TagInput[]): Promise<DataResult<Tag[]>> {
    if (!(await this.userId())) return fail("UNAUTHENTICATED", "Please sign in to continue.");
    const parsed = tagInputSchema.array().safeParse(tags);
    if (!parsed.success) return validationFailed(parsed.error);
    const { data, error } = await this.client.rpc("upsert_tags", { p_room_id: roomId, p_tags: parsed.data });
    if (error) return failFrom(error);
    return ok((data as TagRow[]).map(tagFromRow));
  }

  // -------------------------------------------------------------- Storage helpers

  /** New signed URLs for photos the viewer can already read (Storage policies still decide). Missing paths are omitted. */
  refreshMediaUrls(paths: string[]): Promise<Map<string, string>> {
    return this.signedUrls(paths);
  }

  private async signedUrls(paths: string[]): Promise<Map<string, string>> {
    const urls = new Map<string, string>();
    if (paths.length === 0) return urls;
    const { data, error } = await this.client.storage.from(MEMORY_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error || !data) return urls; // signed_url stays null: the UI shows a placeholder instead of failing the page
    for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    return urls;
  }

  private async removeObjects(paths: string[]): Promise<{ ok: boolean }> {
    let allOk = true;
    for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
      const { error } = await this.client.storage.from(MEMORY_BUCKET).remove(paths.slice(i, i + REMOVE_CHUNK));
      if (error) allOk = false;
    }
    return { ok: allOk };
  }
}
