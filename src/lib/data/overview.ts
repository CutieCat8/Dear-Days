import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import type { DataResult, Memory, Room, Tag } from "@/lib/contracts/types";

import { ok } from "./result";

export type HomeOverview = {
  rooms: Room[];
  memoryCounts: Map<string, number>;
  recent: Memory[];
  places: Tag[];
  people: Tag[];
  moodCounts: Record<string, number>;
  totalMemories: number;
};

/** Everything the Home page shows, gathered through the data contract only (one call set per room). */
export async function loadHomeOverview(source: DearDaysDataSource): Promise<DataResult<HomeOverview>> {
  const rooms = await source.listRooms();
  if (!rooms.ok) return rooms;

  const memoryCounts = new Map<string, number>();
  const memories: Memory[] = [];
  const tags: Tag[] = [];
  // every room's memories and tags are independent: ask for all of them at once instead of one room after another
  const perRoom = await Promise.all(
    rooms.data.map(async (room) => {
      const [page, roomTags] = await Promise.all([
        source.listMemories({ room_id: room.id, page: 1, page_size: 50, sort: "memory_date_desc" }),
        source.listTags(room.id),
      ]);
      return { room, page, roomTags };
    }),
  );
  for (const { room, page, roomTags } of perRoom) {
    if (!page.ok) return page;
    if (!roomTags.ok) return roomTags;
    memoryCounts.set(room.id, page.data.total);
    memories.push(...page.data.items);
    tags.push(...roomTags.data);
  }

  const moodCounts: Record<string, number> = {};
  for (const memory of memories) if (memory.mood) moodCounts[memory.mood] = (moodCounts[memory.mood] ?? 0) + 1;

  return ok({
    rooms: rooms.data,
    memoryCounts,
    recent: [...memories].sort((a, b) => b.memory_date.localeCompare(a.memory_date)).slice(0, 2),
    places: tags.filter((tag) => tag.type === "place"),
    people: tags.filter((tag) => tag.type === "person"),
    moodCounts,
    totalMemories: [...memoryCounts.values()].reduce((sum, value) => sum + value, 0),
  });
}

