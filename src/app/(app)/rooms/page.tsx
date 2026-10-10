import Link from "next/link";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowRightIcon, LockIcon, PlusIcon, UsersIcon } from "@/components/shared/icons";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { DEFAULT_ROOM_COVER_IMAGE, RoomCover, THEME_LABELS } from "@/components/shared/room-cover";
import { getDataSource, getRoomMembers } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

export default async function MyRoomsPage() {
  const source = await getDataSource();
  const rooms = unwrap(await source.listRooms());
  const [countList, membersResult] = await Promise.all([
    Promise.all(rooms.map(async (room) => [room.id, unwrap(await source.listMemories({ room_id: room.id, page: 1, page_size: 1 })).total] as const)),
    getRoomMembers(rooms.map((room) => room.id)),
  ]);
  const counts = new Map<string, number>(countList);
  const members = unwrap(membersResult);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My rooms" }]} />

      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="title-xl">My rooms</h1>
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/rooms/new"><PlusIcon className="size-4" /> Create room</Link>
            <Link className="btn btn-secondary" href="/rooms/join"><UsersIcon className="size-4" /> Join room</Link>
          </div>
        </div>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
          Your private spaces for the people and moments that matter. Write, keep photos, and relive your days together.
        </p>
      </header>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.length === 0 ? <li className="panel col-span-full p-8 text-center text-sm text-[var(--color-muted)]">You are not in any room yet. Create one, or join with an invite code.</li> : null}
        {rooms.map((room) => {
          const count = counts.get(room.id) ?? 0;
          const roomMembers = members.get(room.id) ?? [];

          return (
            <li className="panel flex flex-col overflow-hidden" key={room.id}>
              <Link className="group block" href={`/rooms/${room.id}`}>
                <RoomCover className="aspect-[16/9]" image={DEFAULT_ROOM_COVER_IMAGE} theme={room.theme}>
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-paper)]/90 px-2.5 py-0.5 text-[0.68rem] font-medium text-[var(--color-green-deep)]">
                    <LockIcon className="size-3" /> Private
                  </span>
                </RoomCover>
              </Link>

              <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                <h2 className="title-lg">{room.name}</h2>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">{count} {count === 1 ? "memory" : "memories"}</p>
                <p className="mt-2 text-[0.82rem] leading-6 text-[var(--color-muted)]">
                  {room.life_period} · {THEME_LABELS[room.theme]} theme. {room.description ?? "A private room for the days worth keeping."}
                </p>

                <div className="mt-auto border-t border-[var(--color-border)] pt-3">
                  <p className="text-[0.72rem] text-[var(--color-muted)]">Members ({room.member_count})</p>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {roomMembers.map((member) => (
                      <li className="flex items-center gap-2" key={member.user_id}>
                        <ProfileAvatar className="size-8 bg-[var(--color-sage)] text-sm text-[var(--color-green-deep)]" name={member.display_name} src={member.avatar_url} />
                        <span className="text-[0.78rem] font-medium leading-tight text-[var(--color-ink)]">
                          {member.display_name}
                          {member.role === "owner" ? <span className="block text-[0.66rem] font-normal text-[var(--color-muted)]">Owner</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link className="btn btn-primary mt-3.5 w-full" href={`/rooms/${room.id}`}>Open <ArrowRightIcon className="size-4" /></Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
