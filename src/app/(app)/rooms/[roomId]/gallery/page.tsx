import Image from "next/image";
import Link from "next/link";

import { CalendarStack } from "@/components/features/gallery/calendar-stack";
import { PhotoViewer } from "@/components/features/gallery/photo-viewer";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowRightIcon, BookIcon, CalendarIcon, EditIcon, LockIcon, PinIcon, PlusIcon, SearchIcon, UsersIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import { MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import type { Memory, Tag } from "@/lib/contracts/types";
import { getDataSource, getRoomMembers, getViewer } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";
import { buildGalleryHref, firstGalleryValue, NO_MOOD_VALUE, parseGalleryFilters, type GallerySearchParams } from "@/lib/gallery/filters";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type GalleryPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<GallerySearchParams>;
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
  const rawSearchParams = await searchParams;
  const source = await getDataSource();
  const [room, viewer, availableTags, roomMembers] = await Promise.all([
    source.getRoom(roomId).then(unwrap),
    getViewer(),
    source.listTags(roomId).then(unwrap),
    getRoomMembers([roomId]).then(unwrap),
  ]);
  const names = new Map((roomMembers.get(room.id) ?? []).map((member) => [member.user_id, member.display_name]));
  const authorName = (authorId: string) => names.get(authorId) ?? "A member";
  const filters = parseGalleryFilters(rawSearchParams, availableTags);
  const pageResult = unwrap(await source.listMemories({
    room_id: room.id,
    query: filters.query || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    moods: filters.moods.length ? filters.moods : undefined,
    person_tag_ids: filters.personTagIds.length ? filters.personTagIds : undefined,
    place_tag_ids: filters.placeTagIds.length ? filters.placeTagIds : undefined,
    sort: filters.sort,
    page: filters.page,
    page_size: 50,
  }));
  const filtered = pageResult.items;
  const selectedMoodValues = new Set(filters.moods.map((mood) => mood ?? NO_MOOD_VALUE));
  const hasFilters = Boolean(
    filters.query || filters.dateFrom || filters.dateTo || filters.moods.length ||
    filters.personTagIds.length || filters.placeTagIds.length || filters.sort !== "memory_date_desc",
  );

  const byDate = new Map<string, Memory[]>();
  for (const memory of filtered) byDate.set(memory.memory_date, [...(byDate.get(memory.memory_date) ?? []), memory]);

  const dates = [...byDate.keys()].sort();
  const latestDate = dates.at(-1) ?? new Date().toISOString().slice(0, 10);
  const dayParam = firstGalleryValue(rawSearchParams, "day");
  const memoryParam = firstGalleryValue(rawSearchParams, "memory");
  const selectedDay = DATE_RE.test(dayParam) && byDate.has(dayParam) ? dayParam : latestDate;
  const dayMemories = byDate.get(selectedDay) ?? [];
  const selected = dayMemories.find((item) => item.id === memoryParam) ?? dayMemories.at(-1);

  // Newest month first; always show at least six months so there is something to scroll through.
  const latestMonth = latestDate.slice(0, 7);
  const earliestMonth = (dates[0] ?? latestDate).slice(0, 7);
  const span = Math.min(24, Math.max(5, monthIndex(latestMonth) - monthIndex(earliestMonth)));
  const months = Array.from({ length: span + 1 }, (_, index) => shiftMonth(latestMonth, -index));

  const href = (overrides: { page?: number; day?: string; memory?: string }) => buildGalleryHref(room.id, filters, overrides);
  const totalPages = Math.max(1, Math.ceil(pageResult.total / pageResult.page_size));

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

      <section aria-label="Gallery filters" className="panel mt-5 p-4">
        <form action={`/rooms/${room.id}/gallery`} className="grid gap-4" method="get" role="search">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="field-label" htmlFor="gallery-query">Search</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input className="field-input pl-9" defaultValue={filters.query} id="gallery-query" name="q" placeholder="Title or diary text" type="search" />
              </div>
            </div>

            <fieldset>
              <legend className="field-label">Date range</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-[var(--color-muted)]">From<input className="field-input mt-1" defaultValue={filters.dateFrom} name="date_from" type="date" /></label>
                <label className="text-xs text-[var(--color-muted)]">To<input className="field-input mt-1" defaultValue={filters.dateTo} name="date_to" type="date" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">Mood</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {MOODS.map((value) => (
                  <label className="flex items-center gap-2 text-xs text-[var(--color-ink)]" key={value}>
                    <input className="accent-[var(--color-green)]" defaultChecked={selectedMoodValues.has(value)} name="mood" type="checkbox" value={value} />
                    {MOOD_LABELS[value]}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-xs text-[var(--color-ink)]">
                  <input className="accent-[var(--color-green)]" defaultChecked={selectedMoodValues.has(NO_MOOD_VALUE)} name="mood" type="checkbox" value={NO_MOOD_VALUE} />
                  No mood
                </label>
              </div>
            </fieldset>

            <TagFilterGroup label="People" name="person_tag_ids" selectedIds={filters.personTagIds} tags={availableTags.filter((tag) => tag.type === "person")} />
            <TagFilterGroup label="Places" name="place_tag_ids" selectedIds={filters.placeTagIds} tags={availableTags.filter((tag) => tag.type === "place")} />

            <div>
              <label className="field-label" htmlFor="gallery-sort">Sort by</label>
              <select className="field-input" defaultValue={filters.sort} id="gallery-sort" name="sort">
                <option value="memory_date_desc">Newest memory</option>
                <option value="memory_date_asc">Oldest memory</option>
                <option value="updated_at_desc">Recently updated</option>
              </select>
            </div>
          </div>

          {filters.dateRangeInvalid ? <p className="text-xs text-[#8a3a3a]" role="alert">The start date must be on or before the end date. The date filter was cleared.</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" type="submit">Apply filters</button>
            {hasFilters ? <Link className="text-sm font-medium text-[var(--color-green)] hover:underline" href={`/rooms/${room.id}/gallery`}>Clear filters</Link> : null}
          </div>
        </form>
      </section>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
        <span aria-live="polite">{pageResult.total} {pageResult.total === 1 ? "memory" : "memories"}</span>
        <nav aria-label="Gallery pages" className="flex items-center gap-2">
          {filters.page > 1 ? <Link className="btn btn-secondary btn-sm" href={href({ page: filters.page - 1 })}>Previous</Link> : null}
          <span>Page {Math.min(filters.page, totalPages)} of {totalPages}</span>
          {pageResult.has_more ? <Link className="btn btn-secondary btn-sm" href={href({ page: filters.page + 1 })}>Next</Link> : null}
        </nav>
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
                    {viewer?.id === selected.author_id ? <Link className="btn btn-secondary btn-sm shrink-0" href={`/rooms/${room.id}/memories/${selected.id}/edit`}><EditIcon className="size-3.5" /> Edit memory</Link> : null}
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

function TagFilterGroup({ label, name, selectedIds, tags }: {
  label: string;
  name: string;
  selectedIds: string[];
  tags: Tag[];
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid max-h-28 gap-1.5 overflow-y-auto rounded-md border border-[var(--color-border)] p-2">
        {tags.length ? tags.map((tag) => (
          <label className="flex items-start gap-2 text-xs text-[var(--color-ink)]" key={tag.id}>
            <input className="mt-0.5 accent-[var(--color-green)]" defaultChecked={selectedIds.includes(tag.id)} name={name} type="checkbox" value={tag.id} />
            <span className="break-words">{tag.label}</span>
          </label>
        )) : <p className="text-xs text-[var(--color-muted)]">No tags yet</p>}
      </div>
    </fieldset>
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
