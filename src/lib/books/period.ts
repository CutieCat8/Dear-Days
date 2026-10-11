import type { Memory } from "@/lib/contracts/types";
import { localDateString } from "@/lib/local-date";

/**
 * Month/year math for the books. A memory's `memory_date` is a calendar date (YYYY-MM-DD) chosen by the person,
 * not a moment in time, so everything here works on the text of the date and on UTC-pinned formatters:
 * converting it through the device time zone could move a memory into the neighbouring month.
 */
export type YearMonth = { year: number; month: number };

const pad2 = (value: number) => String(value).padStart(2, "0");

export function yearMonthOf(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

/** The month the person is in right now (their own calendar, via the same helper the memory form uses). */
export function currentYearMonth(now: Date = new Date(), timeZone?: string): YearMonth {
  return yearMonthOf(localDateString(now, timeZone));
}

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthRange(period: YearMonth): { from: string; to: string } {
  return { from: `${period.year}-${pad2(period.month)}-01`, to: `${period.year}-${pad2(period.month)}-${pad2(daysInMonth(period))}` };
}

export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function monthName(month: number, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-US", { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));
}

export function formatMonthYear({ year, month }: YearMonth): string {
  return `${monthName(month)} ${year}`;
}

export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

/** Weekday (0 = Sunday) of the first day of a month, and how many days it has: what a calendar grid needs. */
export function monthGrid(period: YearMonth): { leading: number; days: number } {
  return { leading: new Date(Date.UTC(period.year, period.month - 1, 1)).getUTCDay(), days: daysInMonth(period) };
}

/** Oldest first; ties keep a stable order so the book never reshuffles between loads. */
export function sortOldestFirst(memories: readonly Memory[]): Memory[] {
  return [...memories].sort((a, b) => a.memory_date.localeCompare(b.memory_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function memoriesInMonth(memories: readonly Memory[], period: YearMonth): Memory[] {
  const prefix = `${period.year}-${pad2(period.month)}-`;
  return memories.filter((memory) => memory.memory_date.startsWith(prefix));
}

/** Index 0 = January … 11 = December. */
export function groupByMonth(memories: readonly Memory[]): Memory[][] {
  const months: Memory[][] = Array.from({ length: 12 }, () => []);
  for (const memory of memories) months[yearMonthOf(memory.memory_date).month - 1]?.push(memory);
  return months;
}

export function photoCount(memories: readonly Memory[]): number {
  return memories.reduce((sum, memory) => sum + memory.media.length, 0);
}

export function yearsOf(memories: readonly Memory[]): number[] {
  return [...new Set(memories.map((memory) => yearMonthOf(memory.memory_date).year))].sort((a, b) => b - a);
}

/** Years offered by a year picker: newest first, always including the ones the data and the person's choice need. */
export function yearOptions(anchors: readonly number[], selected: number, now: YearMonth = currentYearMonth()): number[] {
  const all = [...anchors, selected, now.year];
  const oldest = Math.min(...all) - 1;
  const newest = Math.max(...all) + 1;
  const options: number[] = [];
  for (let year = newest; year >= oldest; year -= 1) options.push(year);
  return options;
}
