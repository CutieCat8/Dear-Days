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
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function MemoryCard({ memory }: MemoryCardProps) {
  const cover = memory.media.find((item) => item.id === memory.cover_media_id) ?? memory.media[0];

  return (
    <Link className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]" href={memoryHref(memory)}>
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-sage)]">
        {cover?.signed_url ? (
          <Image alt={cover.alt_text || memory.title} className="object-cover transition duration-500 group-hover:scale-[1.04]" fill sizes="(max-width: 640px) 45vw, 320px" src={cover.signed_url} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,var(--color-sage),var(--color-cream-200))] text-[var(--color-green)]">
            <div className="relative flex h-20 w-16 items-center justify-center rounded-r-lg border-l-[7px] border-[var(--color-green)]/55 bg-[var(--color-paper)] shadow-lg transition group-hover:-rotate-2">
              <BookIcon className="size-8" />
              <span className="absolute bottom-2 h-px w-7 bg-[var(--color-sage-strong)]" />
            </div>
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-paper)]/90 px-2 py-1 text-[10px] font-semibold text-[var(--color-green-deep)] backdrop-blur">
          {cover ? <ImageIcon className="size-3.5" /> : <BookIcon className="size-3.5" />}
          {cover ? `${memory.media.length} รูป` : "บันทึก"}
        </span>
      </div>
      <div className="p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <time className="truncate text-[11px] text-[var(--color-muted)]" dateTime={memory.memory_date}>{formatMemoryDate(memory.memory_date)}</time>
          <MoodBadge compact mood={memory.mood} />
        </div>
        <h3 className="font-display line-clamp-2 text-base leading-snug text-[var(--color-green-deep)] sm:text-lg">{memory.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-muted)]">{memory.body}</p>
      </div>
    </Link>
  );
}
