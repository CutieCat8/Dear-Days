import { MOODS } from "@/lib/contracts/constants";
import type { Memory, Mood } from "@/lib/contracts/types";

import { groupByMonth, photoCount } from "./period";

export type YearStats = {
  memories: number;
  photos: number;
  activeMonths: number;
  busiestMonth: { month: number; count: number } | null;
  topMood: { mood: Mood; count: number } | null;
  places: number;
  people: number;
};

/** Everything here is counted from the memories themselves; nothing is estimated or invented. */
export function yearStats(memories: readonly Memory[]): YearStats {
  const months = groupByMonth(memories);
  const activeMonths = months.filter((month) => month.length > 0).length;
  let busiest: YearStats["busiestMonth"] = null;
  months.forEach((month, index) => {
    if (month.length > 0 && (!busiest || month.length > busiest.count)) busiest = { month: index + 1, count: month.length };
  });

  const moodCounts = new Map<Mood, number>();
  for (const memory of memories) if (memory.mood) moodCounts.set(memory.mood, (moodCounts.get(memory.mood) ?? 0) + 1);
  let topMood: YearStats["topMood"] = null;
  for (const mood of MOODS) {
    const count = moodCounts.get(mood) ?? 0;
    if (count > 0 && (!topMood || count > topMood.count)) topMood = { mood, count };
  }

  const tags = memories.flatMap((memory) => memory.tags);
  return {
    memories: memories.length,
    photos: photoCount(memories),
    activeMonths,
    busiestMonth: busiest,
    topMood,
    places: new Set(tags.filter((tag) => tag.type === "place").map((tag) => tag.id)).size,
    people: new Set(tags.filter((tag) => tag.type === "person").map((tag) => tag.id)).size,
  };
}

/** The memory whose photo stands for a month: the first one (by date) that has a photo to show. */
export function monthCoverMemory(memories: readonly Memory[]): Memory | null {
  return memories.find((memory) => memory.media.some((item) => item.signed_url)) ?? null;
}
