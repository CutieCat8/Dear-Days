import { notFound } from "next/navigation";

import { RoomForm } from "@/components/features/rooms/room-form";
import { mockRooms } from "@/lib/contracts/fixtures";

type EditRoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function EditRoomPage({ params }: EditRoomPageProps) {
  const { roomId } = await params;
  const room = mockRooms.find((item) => item.id === roomId);

  if (!room) notFound();

  return <RoomForm cancelHref={`/rooms/${room.id}`} mode="edit" room={room} />;
}
