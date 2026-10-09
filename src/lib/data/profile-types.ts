import type { Mood } from "@/lib/contracts/types";

// Shared with client components, so this file must not import the data functions.
export const MOOD_OVERVIEW_RANGES = [1, 3, 6, 12] as const;
export type MoodOverviewRange = (typeof MOOD_OVERVIEW_RANGES)[number];

export type MoodOverview = {
  months: MoodOverviewRange;
  /** Inclusive YYYY-MM-DD bounds of the window. */
  from: string;
  to: string;
  counts: Record<Mood, number>;
  /** Memories in the window without a mood. */
  no_mood: number;
};

export type ProfileStats = { rooms: number; memories: number };
