import { notFound } from "next/navigation";

import { RoomForm } from "@/components/features/rooms/room-form";
import { getDataSource, getRoomMembers, getViewer } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

type EditRoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function EditRoomPage({ params }: EditRoomPageProps) {
  const { roomId } = await params;
  const source = await getDataSource();
  const [room, viewer] = await Promise.all([source.getRoom(roomId).then(unwrap), getViewer()]);
  // Only the owner edits a room (the database refuses anyone else too). Members get a 404, not a hint.
  if (!viewer || room.owner_id !== viewer.user_id) notFound();
  const members = unwrap(await getRoomMembers([room.id])).get(room.id) ?? [];

  return <RoomForm cancelHref={`/rooms/${room.id}`} members={members} mode="edit" room={room} />;
}
