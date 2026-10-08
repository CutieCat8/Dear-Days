import { notFound } from "next/navigation";

import { MemoryForm } from "@/components/features/memory/memory-form";
import { mockRooms } from "@/lib/contracts/fixtures";

type NewMemoryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ chooseRoom?: string }>;
};

export default async function NewMemoryPage({ params, searchParams }: NewMemoryPageProps) {
  const { roomId } = await params;
  const { chooseRoom } = await searchParams;
  const room = mockRooms.find((item) => item.id === roomId);

  if (!room) notFound();

  // Home "Quick add" links here with ?chooseRoom=1 so the user picks a room.
  // Entering from inside a room (Add memory) has no param, so the room stays locked.
  // TODO(T6/T19): replace mockRooms with listRooms() so only the user's rooms appear.
  return <MemoryForm mode="create" room={room} rooms={chooseRoom === "1" ? mockRooms : undefined} />;
}
