import { MemoryForm } from "@/components/features/memory/memory-form";
import { listTags } from "@/lib/data/memories";
import { unwrapForPage } from "@/lib/data/page-guards";
import { getRoom, listRooms } from "@/lib/data/rooms";

type NewMemoryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ chooseRoom?: string }>;
};

export default async function NewMemoryPage({ params, searchParams }: NewMemoryPageProps) {
  const { roomId } = await params;
  const { chooseRoom } = await searchParams;
  const room = unwrapForPage(await getRoom(roomId));

  // Home "Quick add" links here with ?chooseRoom=1 so the user picks a room.
  // Entering from inside a room (Add memory) has no param, so the room stays locked.
  const rooms = chooseRoom === "1" ? unwrapForPage(await listRooms()) : undefined;
  const tagResults = await Promise.all((rooms ?? [room]).map((item) => listTags(item.id)));
  const tags = tagResults.flatMap((result) => (result.ok ? result.data : []));

  return <MemoryForm mode="create" room={room} rooms={rooms} tags={tags} />;
}
