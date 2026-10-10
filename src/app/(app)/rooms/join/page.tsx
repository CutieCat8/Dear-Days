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
  const [friendsResult, rooms] = await Promise.all([source.listFriends(), source.listRooms().then(unwrap)]);
  // Not signed in or not allowed keeps its normal route (unwrap). Any other failure of the friends list (for example the
  // friends tables are not in this database yet) must not take the whole page down: joining a room with a code does not
  // need friends, so the page opens with an empty list and says why.
  const friendsUnavailable = !friendsResult.ok && friendsResult.error.code !== "UNAUTHENTICATED" && friendsResult.error.code !== "FORBIDDEN";
  const friends = friendsUnavailable ? { friends: [], incoming: [], outgoing: [] } : unwrap(friendsResult);

  return (
    <FriendsAndRooms
      demo={dataMode() === "mock"}
      friendsNotice={friendsUnavailable ? "Friends are not available on this project yet (a database update is pending). You can still join a room with an invite code." : undefined}
      friends={friends}
      initialCode={initialCode}
      ownedRooms={rooms.filter((room) => room.owner_id === viewer.id)}
      viewerUsername={viewer.username}
    />
  );
}
