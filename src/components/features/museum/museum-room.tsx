import Link from "next/link";

import { ActionLink } from "@/components/shared/action-link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EditIcon, GridIcon, PlusIcon } from "@/components/shared/icons";
import { THEME_LABELS } from "@/components/shared/room-cover";
import type { Memory, Room } from "@/lib/contracts/types";

import { BookShelf } from "@/components/features/books/book-shelf";
import { RoomBooksProvider } from "@/components/features/books/room-books";
import { yearsOf } from "@/lib/books/period";

import { MemoryCard } from "./memory-card";
import { MuseumScene } from "./museum-scene";
import type { FramePins } from "./room-3d/slots";

type MuseumRoomProps = {
  room: Room;
  memories: Memory[];
  /** All memories in the room (can be more than the ones loaded for the scene). */
  total?: number;
  /** Photos the members pinned to specific frames (frame id → memory id). */
  framePins?: FramePins;
  /** Only the owner can edit the room. */
  canEditRoom?: boolean;
  /** The signed-in person's own starred memories of this room; null when they could not be read. */
  favoriteIds?: string[] | null;
};

export function MuseumRoom({ room, memories, total = memories.length, canEditRoom = false, framePins = {}, favoriteIds = [] }: MuseumRoomProps) {
  const basePath = `/rooms/${room.id}`;
  const yearAnchors = [...new Set([...yearsOf(memories), Number(room.created_at.slice(0, 4))])];

  return (
    <RoomBooksProvider initialFavoriteIds={favoriteIds} key={room.id} roomId={room.id} roomName={room.name} yearAnchors={yearAnchors}>
    <article className="pb-6 lg:flex lg:min-h-[calc(100dvh-3rem)] lg:flex-col lg:pb-0">
      <Breadcrumbs items={[{ label: "My rooms", href: "/" }, { label: room.name }]} />

      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mb-3 lg:[text-shadow:0_0_14px_var(--background),0_0_4px_var(--background)]">
        <div>
          <p className="eyebrow mb-1.5">{THEME_LABELS[room.theme]} theme · {room.member_count} of 2 members</p>
          <h1 className="title-xl">{room.name}</h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            {room.life_period} · {total} {total === 1 ? "memory" : "memories"}
          </p>
          {room.description ? <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">{room.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:pointer-events-auto">
          <ActionLink href={`${basePath}/memories/new`} icon={<PlusIcon className="size-4" />}>Add memory</ActionLink>
          <ActionLink href={`${basePath}/gallery`} icon={<GridIcon className="size-4" />} variant="secondary">Gallery view</ActionLink>
          {canEditRoom ? <Link aria-label="Edit room" className="btn btn-secondary px-3" href={`${basePath}/edit`}><EditIcon className="size-4" /></Link> : null}
        </div>
      </header>

      {memories.length === 0 ? (
        <RoomEmptyState roomId={room.id} />
      ) : (
        <>
          <section aria-labelledby="museum-heading" className="hidden lg:flex lg:flex-1 lg:flex-col">
            <h2 className="sr-only" id="museum-heading">Memory museum room</h2>
            <MuseumScene initialPins={framePins} memories={memories} roomId={room.id} />
          </section>

          <div className="lg:hidden">
            <BookShelf />
          </div>

          <section aria-labelledby="mobile-memories-heading" className="mt-6 lg:hidden">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="title-md" id="mobile-memories-heading">Memories in this room</h2>
              <span className="text-xs text-[var(--color-muted)]">{memories.length} items</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {memories.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}
            </div>
          </section>
        </>
      )}
    </article>
    </RoomBooksProvider>
  );
}

function RoomEmptyState({ roomId }: { roomId: string }) {
  return (
    <section className="panel px-6 py-14 text-center sm:px-10">
      <div aria-hidden="true" className="mx-auto mb-5 flex h-20 w-28 items-end justify-center rounded-t-full bg-[var(--color-sage)]/65 pb-2.5">
        <span className="h-9 w-12 rotate-[-4deg] rounded-sm border-[3px] border-[#b89262] bg-[var(--color-cream-100)] shadow-md" />
      </div>
      <h2 className="title-lg">This room is waiting for its first story</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-muted)]">Start with one ordinary day. A photo is optional — a few words can become the first piece in the room.</p>
      <div className="mt-6 inline-flex">
        <ActionLink href={`/rooms/${roomId}/memories/new`} icon={<PlusIcon className="size-4" />}>Add the first memory</ActionLink>
      </div>
    </section>
  );
}
