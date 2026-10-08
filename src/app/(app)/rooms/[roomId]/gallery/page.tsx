import Link from "next/link";
import { notFound } from "next/navigation";

import { MemoryCard } from "@/components/features/museum/memory-card";
import { ArrowLeftIcon, SearchIcon } from "@/components/shared/icons";
import { MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";
import type { Mood } from "@/lib/contracts/types";

const PAGE_SIZE = 6;
const SORTS = {
  memory_date_desc: "ใหม่สุด",
  memory_date_asc: "เก่าสุด",
  updated_at_desc: "แก้ไขล่าสุด",
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
      <Link className="inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" href={`/rooms/${room.id}`}>
        <ArrowLeftIcon className="size-4" /> {room.name}
      </Link>
      <header className="mt-2">
        <h1 className="font-display text-4xl text-[var(--color-green-deep)] sm:text-5xl">{room.name} / Gallery</h1>
        <p className="mt-2 text-[var(--color-muted)]">ความทรงจำทั้งหมดในห้องนี้</p>
      </header>

      <form action={`/rooms/${room.id}/gallery`} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]" method="get" role="search">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-muted)]" />
          <input aria-label="ค้นหาจากชื่อหรือข้อความไดอารี่" className="field-input pl-11" defaultValue={q} name="q" placeholder="ค้นหาจากชื่อหรือข้อความไดอารี่" type="search" />
        </div>
        <select aria-label="มู้ด" className="field-input md:w-44" defaultValue={moodFilter ?? ""} name="mood">
          <option value="">มู้ด: ทั้งหมด</option>
          {MOODS.map((value) => <option key={value} value={value}>{MOOD_LABELS[value]}</option>)}
        </select>
        <select aria-label="เรียงตาม" className="field-input md:w-40" defaultValue={sortKey} name="sort">
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">ค้นหา</button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span aria-live="polite">พบ {filtered.length} ความทรงจำ</span>
        {hasFilters ? <Link className="font-semibold text-[var(--color-green)] hover:underline" href={`/rooms/${room.id}/gallery`}>ล้างตัวกรอง</Link> : null}
      </div>

      {items.length === 0 ? (
        <div className="panel mt-6 px-6 py-16 text-center">
          <h2 className="font-display text-2xl text-[var(--color-green-deep)]">ไม่พบความทรงจำที่ตรงกัน</h2>
          <p className="mt-2 text-[var(--color-muted)]">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="หน้า" className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
            <Link aria-current={target === current ? "page" : undefined} className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold ${target === current ? "bg-[var(--color-green)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sage)]"}`} href={pageHref(target)} key={target}>
              {target}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
