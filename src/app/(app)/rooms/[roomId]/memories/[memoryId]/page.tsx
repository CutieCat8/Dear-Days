import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon, BookIcon, EditIcon, PinIcon, UsersIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import { RoomCover } from "@/components/shared/room-cover";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";

type MemoryDetailPageProps = {
  params: Promise<{ roomId: string; memoryId: string }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

// TODO(T13/T14): replace fixtures with getMemory(roomId, memoryId).
export default async function MemoryDetailPage({ params }: MemoryDetailPageProps) {
  const { roomId, memoryId } = await params;
  const room = mockRooms.find((item) => item.id === roomId);
  const memory = mockMemories.find((item) => item.id === memoryId && item.room_id === roomId);

  if (!room || !memory) notFound();

  const photos = [...memory.media].sort((a, b) => a.position - b.position);
  const cover = photos.find((item) => item.id === memory.cover_media_id) ?? photos[0];
  const people = memory.tags.filter((tag) => tag.type === "person");
  const places = memory.tags.filter((tag) => tag.type === "place");

  return (
    <article className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" href={`/rooms/${room.id}`}>
          <ArrowLeftIcon className="size-4" /> {room.name}
        </Link>
        <Link className="btn btn-secondary !min-h-10 text-sm" href={`/rooms/${room.id}/memories/${memory.id}/edit`}>
          <EditIcon className="size-4" /> แก้ไข
        </Link>
      </div>

      <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-3xl bg-[var(--color-sage)] shadow-[var(--shadow-soft)]">
        {cover?.signed_url ? (
          <Image alt={cover.alt_text || memory.title} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 896px" src={cover.signed_url} />
        ) : (
          <RoomCover className="size-full" theme={room.theme}>
            <BookIcon className="absolute inset-0 m-auto size-14 text-white/80" />
          </RoomCover>
        )}
      </div>

      <header className="mt-8">
        <time className="text-sm font-semibold text-[var(--color-sage-strong)]" dateTime={memory.memory_date}>{formatDate(memory.memory_date)}</time>
        <h1 className="font-display mt-2 text-4xl leading-tight text-[var(--color-green-deep)] sm:text-5xl">{memory.title}</h1>
        <div className="mt-4"><MoodBadge mood={memory.mood} /></div>
      </header>

      <p className="mt-8 whitespace-pre-line text-lg leading-9 text-[var(--color-ink)]">{memory.body}</p>

      {photos.length > 1 ? (
        <ul aria-label="รูปทั้งหมด" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-sage)]" key={photo.id}>
              {photo.signed_url ? <Image alt={photo.alt_text} className="object-cover" fill sizes="(max-width: 640px) 45vw, 280px" src={photo.signed_url} /> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {people.length || places.length ? (
        <div className="panel mt-10 grid gap-6 p-6 sm:grid-cols-2">
          <TagGroup icon={<UsersIcon className="size-5" />} label="คนในความทรงจำ" tags={people.map((tag) => tag.label)} />
          <TagGroup icon={<PinIcon className="size-5" />} label="สถานที่" tags={places.map((tag) => tag.label)} />
        </div>
      ) : null}
    </article>
  );
}

function TagGroup({ icon, label, tags }: { icon: React.ReactNode; label: string; tags: string[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-green-deep)]">{icon} {label}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length ? tags.map((tag) => <span className="chip" key={tag}>{tag}</span>) : <span className="text-sm text-[var(--color-muted)]">—</span>}
      </div>
    </section>
  );
}
