import { RoomForm } from "@/components/features/rooms/room-form";
import { getViewer } from "@/lib/data/server";

export default async function NewRoomPage() {
  const viewer = await getViewer();
  return <RoomForm cancelHref="/" members={viewer ? [{ user_id: viewer.id, role: "owner", display_name: viewer.display_name, avatar_url: viewer.avatar_url }] : []} mode="create" />;
}
