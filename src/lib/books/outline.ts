import type { Memory } from "@/lib/contracts/types";

import { formatDay, groupByMonth, monthName, sortOldestFirst, yearMonthOf, type YearMonth } from "./period";

/** What a book is made of: the memories (already limited to the chosen period) and which period that is. */
export type HighlightFilter = { year: number | null; month: number | null };

export type BookInput =
  | { kind: "monthly"; period: YearMonth; memories: readonly Memory[] }
  | { kind: "yearbook"; year: number; memories: readonly Memory[] }
  | { kind: "highlights"; filter: HighlightFilter; memories: readonly Memory[] };

/** One line of a table of contents. `page` is where it leads (null: nothing to open, e.g. an empty month). */
export type ContentsEntry = { key: string; label: string; detail: string; page: number | null; memoryId?: string; month?: number };

export type BookPage =
  | { type: "cover" }
  | { type: "contents"; entries: ContentsEntry[]; part: number; parts: number; calendar: boolean }
  | { type: "stats" }
  | { type: "month-grid" }
  | { type: "month-divider"; month: number }
  /** `text` is this page's share of the diary; the first page of a memory (photos + title) may carry none. */
  | { type: "memory"; memoryId: string; text: string; part: number; parts: number }
  | { type: "empty" }
  | { type: "closing" };

export type BookLayout = {
  pages: BookPage[];
  /** First page of each memory. */
  memoryPage: Map<string, number>;
  /** Yearbook: the divider page of each month that has memories. */
  monthPage: Map<number, number>;
  /** First memory page of each date (YYYY-MM-DD). */
  dayPage: Map<string, number>;
};

export type BuildOptions = {
  /** Table-of-contents lines per page: with the calendar on top, without it, and on continuation pages. */
  capacity: { calendarFirst: number; first: number; rest: number };
  /** The diary text of a memory cut into pages (index 0 = the page with the photos). */
  textPages: (memory: Memory) => string[];
};

function contentsPageCount(entries: number, calendar: boolean, capacity: BuildOptions["capacity"]): number {
  if (entries === 0 && !calendar) return 0;
  const first = Math.max(0, calendar ? capacity.calendarFirst : capacity.first);
  if (entries <= first) return 1;
  return 1 + Math.ceil((entries - first) / Math.max(1, capacity.rest));
}

function sliceContents(entries: ContentsEntry[], calendar: boolean, capacity: BuildOptions["capacity"], count: number): BookPage[] {
  const pages: BookPage[] = [];
  let next = 0;
  for (let part = 0; part < count; part += 1) {
    const size = part === 0 ? Math.max(0, calendar ? capacity.calendarFirst : capacity.first) : Math.max(1, capacity.rest);
    pages.push({ type: "contents", entries: entries.slice(next, next + size), part, parts: count, calendar: calendar && part === 0 });
    next += size;
  }
  return pages;
}

/** Turns the memories of one period into the pages of a book, and records where each memory, day and month starts. */
export function buildBook(input: BookInput, options: BuildOptions): BookLayout {
  const memories = sortOldestFirst(input.memories);
  const layout: BookLayout = { pages: [{ type: "cover" }], memoryPage: new Map(), monthPage: new Map(), dayPage: new Map() };
  if (memories.length === 0) {
    layout.pages.push({ type: "empty" });
    return layout;
  }

  const byMonth = groupByMonth(memories);
  const calendar = input.kind === "monthly";
  const listed = input.kind === "yearbook" ? 12 : memories.length;
  const contentsCount = contentsPageCount(listed, calendar, options.capacity);
  const front = input.kind === "yearbook" ? 2 : 0; // stats page + months-at-a-glance page
  let index = 1 + contentsCount + front;

  const bodyPages: BookPage[] = [];
  const addMemory = (memory: Memory) => {
    const texts = options.textPages(memory);
    layout.memoryPage.set(memory.id, index);
    if (!layout.dayPage.has(memory.memory_date)) layout.dayPage.set(memory.memory_date, index);
    texts.forEach((text, part) => bodyPages.push({ type: "memory", memoryId: memory.id, text, part, parts: texts.length }));
    index += texts.length;
  };

  if (input.kind === "yearbook") {
    byMonth.forEach((inMonth, monthIndex) => {
      if (inMonth.length === 0) return;
      layout.monthPage.set(monthIndex + 1, index);
      bodyPages.push({ type: "month-divider", month: monthIndex + 1 });
      index += 1;
      inMonth.forEach(addMemory);
    });
  } else {
    memories.forEach(addMemory);
  }

  const entries: ContentsEntry[] =
    input.kind === "yearbook"
      ? byMonth.map((inMonth, monthIndex) => ({
          key: `month-${monthIndex + 1}`,
          label: monthName(monthIndex + 1),
          detail: inMonth.length === 0 ? "No memories" : `${inMonth.length} ${inMonth.length === 1 ? "memory" : "memories"}`,
          page: layout.monthPage.get(monthIndex + 1) ?? null,
          month: monthIndex + 1,
        }))
      : memories.map((memory) => ({
          key: memory.id,
          label: memory.title,
          detail: formatDay(memory.memory_date),
          page: layout.memoryPage.get(memory.id) ?? null,
          memoryId: memory.id,
          month: yearMonthOf(memory.memory_date).month,
        }));

  layout.pages.push(...sliceContents(entries, calendar, options.capacity, contentsCount));
  if (input.kind === "yearbook") layout.pages.push({ type: "stats" }, { type: "month-grid" });
  layout.pages.push(...bodyPages, { type: "closing" });
  return layout;
}

/** Which spread (double-page mode) or page (single-page mode) shows a page index. Page 0 is the cover, alone on the right. */
export function spreadOfPage(page: number, double: boolean): number {
  return double ? Math.ceil(page / 2) : page;
}

export function spreadCount(pageCount: number, double: boolean): number {
  return double ? Math.ceil((pageCount - 1) / 2) + 1 : pageCount;
}

/** The pages shown by a spread: [left, right]; null = no page there. */
export function pagesOfSpread(spread: number, pageCount: number, double: boolean): [number | null, number | null] {
  if (!double) return [null, spread < pageCount ? spread : null];
  if (spread === 0) return [null, 0];
  const left = 2 * spread - 1;
  const right = 2 * spread;
  return [left < pageCount ? left : null, right < pageCount ? right : null];
}
