import { MemoryForm } from "@/components/features/memory/memory-form";
import { getDataSource } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

type NewMemoryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ chooseRoom?: string }>;
};

export default async function NewMemoryPage({ params, searchParams }: NewMemoryPageProps) {
  const { roomId } = await params;
  const { chooseRoom } = await searchParams;
  const source = await getDataSource();
  const room = unwrap(await source.getRoom(roomId));

  // Home "Quick add" links here with ?chooseRoom=1 so the user picks one of their own rooms.
  // Entering from inside a room (Add memory) has no param, so the room stays locked.
  const rooms = chooseRoom === "1" ? unwrap(await source.listRooms()) : [room];
  const tags = (await Promise.all(rooms.map(async (item) => unwrap(await source.listTags(item.id))))).flat();

  return <MemoryForm mode="create" room={room} rooms={chooseRoom === "1" ? rooms : undefined} tags={tags} />;
}
