import Image from "next/image";
import Link from "next/link";

import { MoodBadge } from "@/components/shared/mood-badge";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowRightIcon, CameraIcon, ImageIcon, LeafIcon, LockIcon, PinIcon, PlusIcon, SmileIcon, TextIcon, UsersIcon } from "@/components/shared/icons";
import { DEFAULT_ROOM_COVER_IMAGE, RoomCover, THEME_LABELS } from "@/components/shared/room-cover";
import { MOOD_LABELS } from "@/lib/contracts/constants";
import { mockMemories, mockRooms, mockTags } from "@/lib/contracts/fixtures";
import type { Memory } from "@/lib/contracts/types";

// TODO(T6/T19): replace fixtures with listRooms()/listMemories() from src/lib/data.
export default function HomePage() {
  const recent = [...mockMemories].sort((a, b) => b.memory_date.localeCompare(a.memory_date)).slice(0, 2);
  const places = mockTags.filter((tag) => tag.type === "place");
  const people = mockTags.filter((tag) => tag.type === "person");
  const moodCounts = mockMemories.reduce<Record<string, number>>((acc, memory) => {
    if (memory.mood) acc[memory.mood] = (acc[memory.mood] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as keyof typeof MOOD_LABELS | undefined;

  const stats = [
    { icon: CameraIcon, value: mockMemories.length, label: "memories added" },
    { icon: PinIcon, value: places.length, label: "places visited" },
    { icon: UsersIcon, value: people.length, label: "people in your memories" },
  ];

  return (
    <div>
    <Breadcrumbs items={[{ label: "02 Home", href: "/" }, { label: "Home" }]} />
    <div className="grid gap-7 xl:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="title-xl">Your memories</h1>
            <div className="flex gap-2">
              <Link className="btn btn-primary" href="/rooms/new"><PlusIcon className="size-4" /> Create room</Link>
              <Link className="btn btn-secondary" href="/rooms/join"><UsersIcon className="size-4" /> Join room</Link>
            </div>
          </div>
          <p className="font-display mt-1 flex items-center gap-1.5 text-lg text-[var(--color-sage-strong)]">
            Welcome back, Sea <LeafIcon className="size-4" />
          </p>
        </header>

        <section aria-labelledby="rooms-heading" className="mt-8 scroll-mt-6" id="rooms">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="title-md" id="rooms-heading">Your rooms</h2>
            <span className="text-xs text-[var(--color-muted)]">{mockRooms.length} rooms</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockRooms.map((room) => {
              const count = mockMemories.filter((memory) => memory.room_id === room.id).length;
              return (
                <Link className="panel group overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]" href={`/rooms/${room.id}`} key={room.id}>
                  <RoomCover className="aspect-[16/9]" image={DEFAULT_ROOM_COVER_IMAGE} theme={room.theme}>
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-paper)]/90 px-2 py-0.5 text-[0.65rem] font-medium text-[var(--color-green-deep)]">
                      <LockIcon className="size-3" /> Private
                    </span>
                  </RoomCover>
                  <div className="p-3.5">
                    <h3 className="title-md">{room.name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{room.life_period} · {THEME_LABELS[room.theme]} theme</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 whitespace-nowrap text-xs text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1"><CameraIcon className="size-3.5" /> {count} memories</span>
                      <span className="inline-flex items-center gap-1"><UsersIcon className="size-3.5" /> {room.member_count} of 2 members</span>
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link className="flex min-h-40 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-sage-strong)] hover:bg-[var(--color-sage)]/40 hover:text-[var(--color-green-deep)]" href="/rooms/new">
              <PlusIcon className="size-5" /> Create a new room
            </Link>
          </div>
        </section>

        <section aria-labelledby="recent-heading" className="mt-9">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="title-md" id="recent-heading">Recent private memories</h2>
            <Link className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-green)] hover:underline" href={`/rooms/${mockRooms[0].id}/gallery`}>
              View all memories <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {recent.map((memory) => <RecentDiaryCard key={memory.id} memory={memory} />)}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section aria-labelledby="week-heading" className="panel p-4">
          <h2 className="title-md" id="week-heading">This week</h2>
          <ul className="mt-3 grid gap-0.5">
            {stats.map(({ icon: Icon, value, label }) => (
              <li className="flex items-center gap-3 py-1.5" key={label}>
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-cream-200)] text-[var(--color-green)]"><Icon className="size-4" /></span>
                <span className="text-xs text-[var(--color-muted)]"><b className="font-display mr-1 text-base text-[var(--color-green-deep)]">{value}</b>{label}</span>
              </li>
            ))}
            <li className="mt-1 flex items-center gap-3 border-t border-[var(--color-border)] pt-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-cream-200)] text-[var(--color-green)]"><LeafIcon className="size-4" /></span>
              <span className="text-xs text-[var(--color-muted)]">Mostly <b className="text-[var(--color-green-deep)]">{topMood ? MOOD_LABELS[topMood].toLowerCase() : "—"}</b> this week</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="quick-heading" className="rounded-[var(--radius-lg)] bg-[var(--color-sage)]/70 p-4">
          <h2 className="title-md" id="quick-heading">Quick add memory</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Capture a thought, a photo, or both.</p>
          <Link className="btn btn-primary mt-3 w-full" href={`/rooms/${mockRooms[0].id}/memories/new?chooseRoom=1`}><PlusIcon className="size-4" /> Add memory</Link>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { icon: ImageIcon, label: "Photos" },
              { icon: TextIcon, label: "Text only" },
              { icon: SmileIcon, label: "Add mood" },
            ].map(({ icon: Icon, label }) => (
              <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] text-[0.68rem] font-medium text-[var(--color-green-deep)] transition-colors hover:border-[var(--color-sage-strong)]" href={`/rooms/${mockRooms[0].id}/memories/new?chooseRoom=1`} key={label}>
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="places-heading" className="panel p-4">
          <h2 className="title-md" id="places-heading">Recent places</h2>
          <ul className="mt-2.5 grid gap-2.5">
            {places.map((place) => (
              <li className="flex items-center gap-2.5" key={place.id}>
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-sage)] text-[var(--color-green)]"><PinIcon className="size-4" /></span>
                <span className="text-[0.8rem] font-medium text-[var(--color-green-deep)]">{place.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function RecentDiaryCard({ memory }: { memory: Memory }) {
  const room = mockRooms.find((item) => item.id === memory.room_id);
  const cover = memory.media.find((item) => item.id === memory.cover_media_id) ?? memory.media[0];

  return (
    <Link className="panel group flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]" href={`/rooms/${memory.room_id}/memories/${memory.id}`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 text-[0.72rem] text-[var(--color-muted)]">
        <span>{formatDate(memory.memory_date)} · {room?.name}</span>
        <LockIcon className="size-3.5" />
      </div>
      {cover?.signed_url ? (
        <div className="relative mx-4 mt-3 aspect-[16/8] overflow-hidden rounded-xl bg-[var(--color-sage)]">
          <Image alt={cover.alt_text || memory.title} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" fill sizes="(max-width: 768px) 90vw, 420px" src={cover.signed_url} />
          {memory.media.length > 1 ? <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[0.62rem] font-medium text-white">{memory.media.length} photos</span> : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="title-md">{memory.title}</h3>
        <p className={`mt-1.5 text-[0.82rem] leading-6 text-[var(--color-muted)] ${cover ? "line-clamp-3" : "line-clamp-6"}`}>{memory.body}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <MoodBadge mood={memory.mood} />
          {memory.tags.map((tag) => <span className="chip" key={tag.id}>{tag.label}</span>)}
        </div>
      </div>
    </Link>
  );
}
