import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { mockCurrentProfile, mockMemories, mockRoomMembers, mockRooms, mockTags } from "@/lib/contracts/fixtures";
import type { DataResult, Memory, MemoryListParams, Paginated, Profile, Room, RoomMemberView, Tag } from "@/lib/contracts/types";

import { fail, ok } from "./result";

const READ_ONLY = "Demo mode is read-only. Set NEXT_PUBLIC_DATA_MODE=supabase (and the Supabase keys) to save data.";

/** Read-only demo data. Selected only with DEAR_DAYS_DATA_MODE=mock; never used as a fallback in real mode. */
export class MockDataSource implements DearDaysDataSource {
  async getCurrentProfile(): Promise<DataResult<Profile>> {
    return ok(mockCurrentProfile);
  }

  async updateProfile(): Promise<DataResult<Profile>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async listRoomMembers(roomId: string): Promise<DataResult<RoomMemberView[]>> {
    const members = mockRoomMembers.filter((member) => member.room_id === roomId);
    return members.length > 0 ? ok(members) : fail("FORBIDDEN", "You are not a member of this room.");
  }

  async removeRoomMember(): Promise<DataResult<{ user_id: string }>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async listRooms(): Promise<DataResult<Room[]>> {
    return ok(mockRooms);
  }

  async getRoom(roomId: string): Promise<DataResult<Room>> {
    const room = mockRooms.find((item) => item.id === roomId);
    return room ? ok(room) : fail("NOT_FOUND", "We could not find that room.");
  }

  async createRoom(): Promise<DataResult<Room>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async updateRoom(): Promise<DataResult<Room>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async deleteRoom(): Promise<DataResult<{ id: string }>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async joinRoom(): Promise<DataResult<Room>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>> {
    const all = mockMemories.filter((memory) => memory.room_id === params.room_id);
    const query = params.query?.toLowerCase();
    const items = all
      .filter((memory) => !query || `${memory.title} ${memory.body}`.toLowerCase().includes(query))
      .filter((memory) => !params.date_from || memory.memory_date >= params.date_from)
      .filter((memory) => !params.date_to || memory.memory_date <= params.date_to)
      .filter((memory) => !params.moods || params.moods.length === 0 || params.moods.includes(memory.mood))
      .filter((memory) => !params.person_tag_ids?.length || memory.tags.some((tag) => params.person_tag_ids?.includes(tag.id)))
      .filter((memory) => !params.place_tag_ids?.length || memory.tags.some((tag) => params.place_tag_ids?.includes(tag.id)))
      .filter((memory) => !params.period_label || memory.period_label === params.period_label)
      .sort((a, b) => (params.sort === "memory_date_asc" ? a.memory_date.localeCompare(b.memory_date) : b.memory_date.localeCompare(a.memory_date)));
    const page = params.page ?? 1;
    const size = params.page_size ?? 20;
    return ok({ items: items.slice((page - 1) * size, page * size), page, page_size: size, total: items.length, has_more: page * size < items.length });
  }

  async getMemory(roomId: string, memoryId: string): Promise<DataResult<Memory>> {
    const memory = mockMemories.find((item) => item.id === memoryId && item.room_id === roomId);
    return memory ? ok(memory) : fail("NOT_FOUND", "We could not find that memory.");
  }

  async createMemory(): Promise<DataResult<Memory>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async updateMemory(): Promise<DataResult<Memory>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async deleteMemory(): Promise<DataResult<{ id: string }>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }

  async listTags(roomId: string): Promise<DataResult<Tag[]>> {
    return ok(mockTags.filter((tag) => tag.room_id === roomId));
  }

  async upsertTags(): Promise<DataResult<Tag[]>> {
    return fail("INTERNAL_ERROR", READ_ONLY);
  }
}
