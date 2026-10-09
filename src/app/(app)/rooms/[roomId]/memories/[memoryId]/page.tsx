import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { BookIcon, CalendarIcon, EditIcon, PinIcon, UsersIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import { RoomCover } from "@/components/shared/room-cover";
import { DeleteMemoryButton } from "@/components/features/memory/delete-memory-button";
import { getMemory } from "@/lib/data/memories";
import { unwrapForPage } from "@/lib/data/page-guards";
import { getCurrentProfile } from "@/lib/data/profile";
import { getRoom } from "@/lib/data/rooms";

type MemoryDetailPageProps = {
  params: Promise<{ roomId: string; memoryId: string }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default async function MemoryDetailPage({ params }: MemoryDetailPageProps) {
  const { roomId, memoryId } = await params;
  const room = unwrapForPage(await getRoom(roomId));
  const memory = unwrapForPage(await getMemory(roomId, memoryId));
  const profile = unwrapForPage(await getCurrentProfile());
  const isAuthor = memory.author_id === profile.id;

  const photos = [...memory.media].sort((a, b) => a.position - b.position);
  const cover = photos.find((item) => item.id === memory.cover_media_id) ?? photos[0];
  const people = memory.tags.filter((tag) => tag.type === "person");
  const places = memory.tags.filter((tag) => tag.type === "place");

  return (
    <article>
      <Breadcrumbs items={[{ label: "My rooms", href: "/" }, { label: room.name, href: `/rooms/${room.id}` }, { label: memory.title }]} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-sage)] shadow-[var(--shadow-soft)]">
            {cover?.signed_url ? (
              <Image alt={cover.alt_text || memory.title} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 560px" src={cover.signed_url} />
            ) : (
              <RoomCover className="size-full" theme={room.theme}>
                <BookIcon className="absolute inset-0 m-auto size-12 text-white/80" />
              </RoomCover>
            )}
            {photos.length > 1 ? <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[0.68rem] font-medium text-white">1 / {photos.length}</span> : null}
          </div>

          {photos.length > 1 ? (
            <ul aria-label="All photos" className="mt-3 grid grid-cols-4 gap-2.5">
              {photos.map((photo) => (
                <li className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-sage)]" key={photo.id}>
                  {photo.signed_url ? <Image alt={photo.alt_text} className="object-cover" fill sizes="120px" src={photo.signed_url} /> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="title-xl">{memory.title}</h1>
            {isAuthor ? (
              <div className="flex shrink-0 gap-2">
                <Link className="btn btn-secondary btn-sm" href={`/rooms/${room.id}/memories/${memory.id}/edit`}>
                  <EditIcon className="size-3.5" /> Edit
                </Link>
                <DeleteMemoryButton memoryId={memory.id} roomId={room.id} title={memory.title} />
              </div>
            ) : null}
          </div>
          <p className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1.5"><CalendarIcon className="size-3.5" /> <time dateTime={memory.memory_date}>{formatDate(memory.memory_date)}</time></span>
            <span aria-hidden="true">·</span>
            <MoodBadge mood={memory.mood} />
          </p>

          <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-7 text-[var(--color-ink)]">{memory.body}</p>

          {people.length || places.length ? (
            <div className="mt-6 grid gap-5 border-t border-[var(--color-border)] pt-5">
              <TagGroup icon={<UsersIcon className="size-4" />} label="People" tags={people.map((tag) => tag.label)} />
              <TagGroup icon={<PinIcon className="size-4" />} label="Places" tags={places.map((tag) => tag.label)} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TagGroup({ icon, label, tags }: { icon: React.ReactNode; label: string; tags: string[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--color-green-deep)]">{icon} {label}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.length ? tags.map((tag) => <span className="chip" key={tag}>{tag}</span>) : <span className="text-xs text-[var(--color-muted)]">—</span>}
      </div>
    </section>
  );
}
