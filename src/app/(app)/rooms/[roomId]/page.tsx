import { MuseumRoom } from "@/components/features/museum/museum-room";
import type { Memory } from "@/lib/contracts/types";
import { getDataSource, getViewer } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

/** The 3D room shows at most this many objects (15 frames + 3 diaries); a few extra cover the mobile card list. */
const SCENE_MEMORIES = 100;

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const source = await getDataSource();
  const room = unwrap(await source.getRoom(roomId));

  const memories: Memory[] = [];
  let total = 0;
  for (let page = 1; memories.length < SCENE_MEMORIES; page += 1) {
    const result = unwrap(await source.listMemories({ room_id: room.id, page, page_size: 50, sort: "memory_date_desc" }));
    total = result.total;
    memories.push(...result.items);
    if (!result.has_more) break;
  }

  // A missing or unreadable layout must never break the room: the frames then fill automatically.
  // Favorites are different: if they cannot be read the stars are switched off (null), never shown as "nothing starred".
  const [assignments, favorites] = await Promise.all([source.listFrameAssignments(room.id), source.listFavoriteMemoryIds(room.id)]);
  const framePins = Object.fromEntries((assignments.ok ? assignments.data : []).map((item) => [item.slot_id, item.memory_id]));

  const viewer = await getViewer();
  return <MuseumRoom canEditRoom={viewer?.id === room.owner_id} favoriteIds={favorites.ok ? favorites.data : null} framePins={framePins} memories={memories} room={room} total={total} />;
}
