import { MOODS } from "@/lib/contracts/constants";
import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import type { DataResult, Memory, Mood } from "@/lib/contracts/types";

import { ok } from "./result";

export const MOOD_RANGES = [1, 3, 6, 12] as const;
export type MoodRange = (typeof MOOD_RANGES)[number];

export type ProfileOverview = {
  roomCount: number;
  /** Memories the viewer wrote, in every room they belong to. */
  memoryCount: number;
  mood: {
    months: MoodRange;
    /** Inclusive YYYY-MM-DD window, ending today. */
    from: string;
    to: string;
    counts: Record<Mood, number>;
    withoutMood: number;
  };
};

const PAGE_SIZE = 50;

export function parseMoodRange(value: string | string[] | undefined): MoodRange {
  const months = Number(Array.isArray(value) ? value[0] : value);
  return (MOOD_RANGES as readonly number[]).includes(months) ? (months as MoodRange) : 3;
}

/** The window `[today - months + 1 day, today]` as local calendar dates. */
export function moodWindow(months: MoodRange, today: Date): { from: string; to: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  const format = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  // Clamp to the last day of the earlier month (31 Mar - 1 month = 28/29 Feb, not 3 Mar), then start the next day.
  const lastDayThen = new Date(today.getFullYear(), today.getMonth() - months + 1, 0).getDate();
  const start = new Date(today.getFullYear(), today.getMonth() - months, Math.min(today.getDate(), lastDayThen) + 1);
  return { from: format(start), to: format(today) };
}

/**
 * Profile page numbers, gathered through the data contract only (same approach as the Home overview):
 * rooms the viewer belongs to, memories they wrote, and the moods of those memories in the chosen window.
 */
export async function loadProfileOverview(source: DearDaysDataSource, viewerId: string, months: MoodRange, today = new Date()): Promise<DataResult<ProfileOverview>> {
  const rooms = await source.listRooms();
  if (!rooms.ok) return rooms;

  const mine: Memory[] = [];
  for (const room of rooms.data) {
    for (let page = 1; ; page += 1) {
      const result = await source.listMemories({ room_id: room.id, page, page_size: PAGE_SIZE, sort: "memory_date_desc" });
      if (!result.ok) return result;
      mine.push(...result.data.items.filter((memory) => memory.author_id === viewerId));
      if (!result.data.has_more) break;
    }
  }

  const { from, to } = moodWindow(months, today);
  const counts = Object.fromEntries(MOODS.map((mood) => [mood, 0])) as Record<Mood, number>;
  let withoutMood = 0;
  for (const memory of mine) {
    if (memory.memory_date < from || memory.memory_date > to) continue;
    if (memory.mood) counts[memory.mood] += 1;
    else withoutMood += 1;
  }

  return ok({ roomCount: rooms.data.length, memoryCount: mine.length, mood: { months, from, to, counts, withoutMood } });
}
