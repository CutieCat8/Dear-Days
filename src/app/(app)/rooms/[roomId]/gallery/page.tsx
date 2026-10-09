import Image from "next/image";
import Link from "next/link";

import { CalendarStack } from "@/components/features/gallery/calendar-stack";
import { PhotoViewer } from "@/components/features/gallery/photo-viewer";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowRightIcon, BookIcon, CalendarIcon, EditIcon, LockIcon, PinIcon, PlusIcon, SearchIcon, UsersIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import { MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import type { Memory, Mood } from "@/lib/contracts/types";
import { getDataSource, getRoomMembers } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type GalleryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ q?: string; mood?: string; day?: string; memory?: string }>;
};

function coverOf(memory: Memory) {
  return memory.media.find((item) => item.id === memory.cover_media_id) ?? memory.media[0];
}

function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, number - 1, 1)));
}

function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthIndex(month: string) {
  const [year, number] = month.split("-").map(Number);
  return year * 12 + number - 1;
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default async function GalleryPage({ params, searchParams }: GalleryPageProps) {
  const { roomId } = await params;
  const { q = "", mood = "", day: dayParam = "", memory: memoryParam = "" } = await searchParams;
  const source = await getDataSource();
  const room = unwrap(await source.getRoom(roomId));
  const names = new Map((unwrap(await getRoomMembers([room.id])).get(room.id) ?? []).map((member) => [member.user_id, member.display_name]));
  const authorName = (authorId: string) => names.get(authorId) ?? "A member";

  const moodFilter = (MOODS as readonly string[]).includes(mood) ? (mood as Mood) : null;
  const needle = q.trim().toLowerCase();
  const hasFilters = Boolean(needle || moodFilter);

  // Filters run in the database (listMemories); the calendar needs every match, so read all pages (50 per page).
  const filtered: Memory[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const result = unwrap(await source.listMemories({ room_id: room.id, query: needle || undefined, moods: moodFilter ? [moodFilter] : undefined, page, page_size: 50, sort: "memory_date_asc" }));
    filtered.push(...result.items);
    if (!result.has_more) break;
  }

  const byDate = new Map<string, Memory[]>();
  for (const memory of filtered) byDate.set(memory.memory_date, [...(byDate.get(memory.memory_date) ?? []), memory]);

  const dates = [...byDate.keys()].sort();
  const latestDate = dates.at(-1) ?? new Date().toISOString().slice(0, 10);
  const selectedDay = DATE_RE.test(dayParam) && byDate.has(dayParam) ? dayParam : latestDate;
  const dayMemories = byDate.get(selectedDay) ?? [];
  const selected = dayMemories.find((item) => item.id === memoryParam) ?? dayMemories.at(-1);

  // Newest month first; always show at least six months so there is something to scroll through.
  const latestMonth = latestDate.slice(0, 7);
  const earliestMonth = (dates[0] ?? latestDate).slice(0, 7);
  const span = Math.min(24, Math.max(5, monthIndex(latestMonth) - monthIndex(earliestMonth)));
  const months = Array.from({ length: span + 1 }, (_, index) => shiftMonth(latestMonth, -index));

  const href = (overrides: { day?: string; memory?: string }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (moodFilter) query.set("mood", moodFilter);
    if (overrides.day) query.set("day", overrides.day);
    if (overrides.memory) query.set("memory", overrides.memory);
    return `/rooms/${room.id}/gallery?${query.toString()}`;
  };

  const people = selected?.tags.filter((tag) => tag.type === "person") ?? [];
  const places = selected?.tags.filter((tag) => tag.type === "place") ?? [];
  const photos = selected ? [...selected.media].sort((a, b) => a.position - b.position) : [];
  const selectedCover = selected ? coverOf(selected) : undefined;
  const viewerPhotos = photos.flatMap((photo) => (photo.signed_url ? [{ id: photo.id, url: photo.signed_url, alt: photo.alt_text }] : []));

  return (
    <div>
      <Breadcrumbs items={[{ label: "My rooms", href: "/rooms" }, { label: room.name, href: `/rooms/${room.id}` }, { label: "Gallery" }]} />
      <header>
        <h1 className="title-xl">{room.name} <span className="text-[var(--color-sage-strong)]">/ Gallery</span></h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">All the memories from this room, day by day.</p>
      </header>

      <form action={`/rooms/${room.id}/gallery`} className="mt-5 grid gap-2.5 md:grid-cols-[1fr_auto_auto]" method="get" role="search">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input aria-label="Search by title or diary text" className="field-input pl-9" defaultValue={q} name="q" placeholder="Search by title or diary text…" type="search" />
        </div>
        <select aria-label="Mood" className="field-input md:w-40" defaultValue={moodFilter ?? ""} name="mood">
          <option value="">Mood: All</option>
          {MOODS.map((value) => <option key={value} value={value}>{MOOD_LABELS[value]}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span aria-live="polite">{filtered.length} {filtered.length === 1 ? "memory" : "memories"}</span>
        {hasFilters ? <Link className="font-medium text-[var(--color-green)] hover:underline" href={`/rooms/${room.id}/gallery`}>Clear filters</Link> : null}
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside aria-label="Calendar months" className="min-w-0 lg:sticky lg:top-6">
          <CalendarStack
            activeMonth={selectedDay.slice(0, 7)}
            items={months.map((month) => ({ month, node: <MonthCard byDate={byDate} href={href} month={month} selectedDay={selectedDay} /> }))}
          />
        </aside>

        <section aria-label="Selected day" className="panel min-w-0 p-4 sm:p-6">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1.5"><CalendarIcon className="size-3.5" /> {longDate(selected.memory_date)} · {room.name}</span>
                <span className="inline-flex items-center gap-1.5"><LockIcon className="size-3.5" /> Private</span>
              </div>

              {dayMemories.length > 1 ? (
                <nav aria-label="Memories on this day" className="mt-3 flex flex-wrap gap-1.5">
                  {dayMemories.map((item) => (
                    <Link aria-current={item.id === selected.id ? "true" : undefined} className={`rounded-full px-3 py-1 text-xs font-medium ${item.id === selected.id ? "bg-[var(--color-button)] text-white" : "bg-[var(--color-cream-200)] text-[var(--color-green-deep)] hover:bg-[var(--color-sage)]"}`} href={href({ day: selectedDay, memory: item.id })} key={item.id}>{item.title}</Link>
                  ))}
                </nav>
              ) : null}

              <div className={`mt-4 grid gap-6 ${viewerPhotos.length ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" : ""}`}>
                {viewerPhotos.length ? <PhotoViewer initialId={selectedCover?.id} key={selected.id} photos={viewerPhotos} title={selected.title} /> : null}

                <div className="flex min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="title-xl !text-[1.7rem]">{selected.title}</h2>
                    <Link className="btn btn-secondary btn-sm shrink-0" href={`/rooms/${room.id}/memories/${selected.id}/edit`}><EditIcon className="size-3.5" /> Edit memory</Link>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                    <CalendarIcon className="size-3.5" /> {longDate(selected.memory_date)} <span aria-hidden="true">·</span> by {authorName(selected.author_id)}
                  </p>
                  <div className="mt-3"><MoodBadge mood={selected.mood} /></div>

                  <p className="mt-4 max-w-prose whitespace-pre-line text-[0.9rem] leading-7 text-[var(--color-ink)]">{selected.body}</p>

                  <div className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-4">
                    <div>
                      <h3 className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--color-green-deep)]"><UsersIcon className="size-4" /> People</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {people.length ? people.map((tag) => (
                          <span className="chip !min-h-8 !pl-1 !pr-3" key={tag.id}>
                            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-[var(--color-sage)] text-[0.65rem] font-semibold">{tag.label.charAt(0)}</span>
                            {tag.label}
                          </span>
                        )) : <span className="text-xs text-[var(--color-muted)]">—</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--color-green-deep)]"><PinIcon className="size-4" /> Places</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {places.length ? places.map((tag) => <span className="chip !min-h-8 !px-3" key={tag.id}>{tag.label}</span>) : <span className="text-xs text-[var(--color-muted)]">—</span>}
                      </div>
                    </div>
                  </div>

                  <Link className="btn btn-primary btn-sm mt-5 self-start" href={`/rooms/${room.id}/memories/${selected.id}`}>Open memory <ArrowRightIcon className="size-3.5" /></Link>
                </div>
              </div>
            </article>
          ) : (
            <div className="px-4 py-14 text-center">
              <h2 className="title-lg">{hasFilters ? "No matching memories" : "No memories yet"}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">{hasFilters ? "Try a different search or clear the filters." : "Add a memory for a day you want to keep."}</p>
              <Link className="btn btn-primary mt-5" href={`/rooms/${room.id}/memories/new`}><PlusIcon className="size-4" /> Add memory</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MonthCard({ month, byDate, selectedDay, href }: {
  month: string;
  byDate: Map<string, Memory[]>;
  selectedDay: string;
  href: (overrides: { day?: string; memory?: string }) => string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = [...Array.from({ length: offset }, () => 0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const count = [...byDate.entries()].filter(([date]) => date.startsWith(month)).reduce((sum, [, list]) => sum + list.length, 0);

  return (
    <section aria-label={monthLabel(month)} className="panel p-3">
      <h2 className="font-display text-[0.95rem] leading-tight text-[var(--color-green-deep)]">{monthLabel(month)}</h2>
      <p className="text-[0.65rem] text-[var(--color-muted)]">{count} {count === 1 ? "memory" : "memories"} this month</p>

      <div className="mt-2.5 grid grid-cols-7 gap-1 text-center text-[0.58rem] font-medium text-[var(--color-muted)]">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === 0) return <span aria-hidden="true" key={`blank-${index}`} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const entries = byDate.get(date);

          if (!entries) {
            return <span className="flex aspect-square items-center justify-center rounded-md bg-[var(--color-cream-100)]/80 text-[0.6rem] text-[var(--color-muted)]/70" key={date}>{day}</span>;
          }

          const cover = coverOf(entries[0]);
          const isSelected = date === selectedDay;
          return (
            <Link
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${longDate(date)}: ${entries.length} ${entries.length === 1 ? "memory" : "memories"}, ${entries[0].title}`}
              className={`relative block aspect-square overflow-hidden rounded-md bg-[var(--color-sage)] transition-shadow ${isSelected ? "ring-2 ring-[var(--color-button)] ring-offset-1 ring-offset-[var(--color-paper)]" : "hover:ring-2 hover:ring-[var(--color-sage-strong)]/60"}`}
              href={href({ day: date })}
              key={date}
            >
              {cover?.signed_url ? (
                <Image alt="" className="object-cover" fill sizes="40px" src={cover.signed_url} />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[var(--color-green)]/70"><BookIcon className="size-3.5" /></span>
              )}
              <span className="absolute left-0.5 top-0.5 rounded-sm bg-black/45 px-0.5 text-[0.55rem] font-medium leading-3 text-white">{day}</span>
              {entries.length > 1 ? <span className="absolute bottom-0.5 right-0.5 rounded-full bg-white/85 px-1 text-[0.5rem] font-semibold leading-3 text-[var(--color-green-deep)]">{entries.length}</span> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
