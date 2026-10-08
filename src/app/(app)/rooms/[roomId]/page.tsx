import { notFound } from "next/navigation";

import { MuseumRoom } from "@/components/features/museum/museum-room";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const room = mockRooms.find((item) => item.id === roomId);

  if (!room) notFound();

  const memories = mockMemories.filter((memory) => memory.room_id === room.id);
  return <MuseumRoom memories={memories} room={room} />;
}
