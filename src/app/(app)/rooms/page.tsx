import Link from "next/link";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowRightIcon, LockIcon, PlusIcon, UsersIcon } from "@/components/shared/icons";
import { DEFAULT_ROOM_COVER_IMAGE, RoomCover, THEME_LABELS } from "@/components/shared/room-cover";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";

// TODO(T6/T19): replace fixtures with listRooms() and real member profiles.
const MEMBERS = [
  { name: "Sea", role: "Owner" },
  { name: "Mint", role: "Member" },
];

export default function MyRoomsPage() {
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
        {mockRooms.map((room) => {
          const count = mockMemories.filter((memory) => memory.room_id === room.id).length;
          const members = MEMBERS.slice(0, room.member_count);

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
                  {room.life_period} · {THEME_LABELS[room.theme]} theme. A private room for the days worth keeping.
                </p>

                <div className="mt-auto border-t border-[var(--color-border)] pt-3">
                  <p className="text-[0.72rem] text-[var(--color-muted)]">Members ({room.member_count})</p>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {members.map((member) => (
                      <li className="flex items-center gap-2" key={member.name}>
                        <span aria-hidden="true" className="font-display flex size-8 items-center justify-center rounded-full bg-[var(--color-sage)] text-sm text-[var(--color-green-deep)]">{member.name.charAt(0)}</span>
                        <span className="text-[0.78rem] font-medium leading-tight text-[var(--color-ink)]">
                          {member.name}
                          {member.role === "Owner" ? <span className="block text-[0.66rem] font-normal text-[var(--color-muted)]">Owner</span> : null}
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
