import { redirect } from "next/navigation";

import { FriendsAndRooms } from "@/components/features/friends/friends-and-rooms";
import { dataMode } from "@/lib/data/config";
import { getDataSource, getViewer } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

type FriendsAndRoomsPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

/** Friends & Rooms: add friends, share a room's invite, or join with a code (`/rooms/join?code=` invite links land here). */
export default async function FriendsAndRoomsPage({ searchParams }: FriendsAndRoomsPageProps) {
  const [{ code }, viewer, source] = await Promise.all([searchParams, getViewer(), getDataSource()]);
  if (!viewer) redirect("/sign-in?next=%2Frooms%2Fjoin");

  const raw = Array.isArray(code) ? code[0] : code;
  const initialCode = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const [friends, rooms] = await Promise.all([source.listFriends().then(unwrap), source.listRooms().then(unwrap)]);

  return (
    <FriendsAndRooms
      demo={dataMode() === "mock"}
      friends={friends}
      initialCode={initialCode}
      ownedRooms={rooms.filter((room) => room.owner_id === viewer.id)}
      viewerUsername={viewer.username}
    />
  );
}
