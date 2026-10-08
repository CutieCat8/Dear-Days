import Link from "next/link";
import { notFound } from "next/navigation";

import { MemoryCard } from "@/components/features/museum/memory-card";
import { SearchIcon } from "@/components/shared/icons";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";
import type { Mood } from "@/lib/contracts/types";

const PAGE_SIZE = 6;
const SORTS = {
  memory_date_desc: "Newest",
  memory_date_asc: "Oldest",
  updated_at_desc: "Recently edited",
} as const;

type SortKey = keyof typeof SORTS;

type GalleryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ q?: string; mood?: string; sort?: string; page?: string }>;
};

// TODO(T10/T14): replace the in-memory filter with listMemories(MemoryListParams).
export default async function GalleryPage({ params, searchParams }: GalleryPageProps) {
  const { roomId } = await params;
  const { q = "", mood = "", sort = "memory_date_desc", page = "1" } = await searchParams;
  const room = mockRooms.find((item) => item.id === roomId);

  if (!room) notFound();

  const sortKey: SortKey = sort in SORTS ? (sort as SortKey) : "memory_date_desc";
  const moodFilter = (MOODS as readonly string[]).includes(mood) ? (mood as Mood) : null;
  const needle = q.trim().toLowerCase();

  const filtered = mockMemories
    .filter((memory) => memory.room_id === room.id)
    .filter((memory) => !needle || `${memory.title} ${memory.body}`.toLowerCase().includes(needle))
    .filter((memory) => !moodFilter || memory.mood === moodFilter)
    .sort((a, b) => {
      if (sortKey === "memory_date_asc") return a.memory_date.localeCompare(b.memory_date);
      if (sortKey === "updated_at_desc") return b.updated_at.localeCompare(a.updated_at);
      return b.memory_date.localeCompare(a.memory_date);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const items = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const hasFilters = Boolean(needle || moodFilter);

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (moodFilter) params.set("mood", moodFilter);
    if (sortKey !== "memory_date_desc") params.set("sort", sortKey);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return `/rooms/${room.id}/gallery${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "My rooms", href: "/" }, { label: room.name, href: `/rooms/${room.id}` }, { label: "Gallery" }]} />
      <header>
        <h1 className="title-xl">{room.name} <span className="text-[var(--color-sage-strong)]">/ Gallery</span></h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">All the memories from this room.</p>
      </header>

      <form action={`/rooms/${room.id}/gallery`} className="mt-5 grid gap-2.5 md:grid-cols-[1fr_auto_auto_auto]" method="get" role="search">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input aria-label="Search by title or diary text" className="field-input pl-9" defaultValue={q} name="q" placeholder="Search by title or diary text…" type="search" />
        </div>
        <select aria-label="Mood" className="field-input md:w-40" defaultValue={moodFilter ?? ""} name="mood">
          <option value="">Mood: All</option>
          {MOODS.map((value) => <option key={value} value={value}>{MOOD_LABELS[value]}</option>)}
        </select>
        <select aria-label="Sort by" className="field-input md:w-40" defaultValue={sortKey} name="sort">
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span aria-live="polite">{filtered.length} {filtered.length === 1 ? "memory" : "memories"}</span>
        {hasFilters ? <Link className="font-medium text-[var(--color-green)] hover:underline" href={`/rooms/${room.id}/gallery`}>Clear filters</Link> : null}
      </div>

      {items.length === 0 ? (
        <div className="panel mt-5 px-6 py-14 text-center">
          <h2 className="title-lg">No matching memories</h2>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-7 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
            <Link aria-current={target === current ? "page" : undefined} className={`flex size-9 items-center justify-center rounded-full text-[0.8rem] font-medium ${target === current ? "bg-[var(--color-green)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sage)]"}`} href={pageHref(target)} key={target}>
              {target}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
