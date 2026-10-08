import Image from "next/image";
import Link from "next/link";

import { BookIcon, ImageIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import type { Memory } from "@/lib/contracts/types";

type MemoryCardProps = {
  memory: Memory;
};

function memoryHref(memory: Memory) {
  return `/rooms/${memory.room_id}/memories/${memory.id}`;
}

function formatMemoryDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function MemoryCard({ memory }: MemoryCardProps) {
  const cover = memory.media.find((item) => item.id === memory.cover_media_id) ?? memory.media[0];

  return (
    <Link className="group min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]" href={memoryHref(memory)}>
      <div className="relative aspect-[16/11] overflow-hidden bg-[var(--color-sage)]">
        {cover?.signed_url ? (
          <Image alt={cover.alt_text || memory.title} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" fill sizes="(max-width: 640px) 45vw, 300px" src={cover.signed_url} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,var(--color-sage),var(--color-cream-200))] text-[var(--color-green)]">
            <div className="relative flex h-16 w-12 items-center justify-center rounded-r-md border-l-[5px] border-[var(--color-green)]/55 bg-[var(--color-paper)] shadow-md">
              <BookIcon className="size-6" />
              <span className="absolute bottom-1.5 h-px w-5 bg-[var(--color-sage-strong)]" />
            </div>
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-paper)]/90 px-2 py-0.5 text-[0.62rem] font-medium text-[var(--color-green-deep)] backdrop-blur">
          {cover ? <ImageIcon className="size-3" /> : <BookIcon className="size-3" />}
          {cover ? `${memory.media.length} ${memory.media.length === 1 ? "photo" : "photos"}` : "Note"}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-display line-clamp-1 text-[0.95rem] leading-snug text-[var(--color-green-deep)]">{memory.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-[1.45] text-[var(--color-muted)]">{memory.body}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <time className="truncate text-[0.68rem] text-[var(--color-muted)]" dateTime={memory.memory_date}>{formatMemoryDate(memory.memory_date)}</time>
          <MoodBadge compact={false} mood={memory.mood} />
        </div>
      </div>
    </Link>
  );
}
