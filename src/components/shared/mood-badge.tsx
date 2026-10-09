import { MOOD_LABELS } from "@/lib/contracts/constants";
import type { Mood } from "@/lib/contracts/types";

const MOOD_ICONS: Record<Mood, string> = {
  awful: "☂",
  stressed: "≋",
  sad: "◌",
  relaxed: "❧",
  happy: "☀",
  excited: "✦",
};

/** Text colors of the mood badges (kept in sync with `.mood-badge[data-mood]` in globals.css). */
export const MOOD_TEXT_COLORS: Record<Mood | "none", string> = {
  awful: "#74505b",
  stressed: "#5b5478",
  sad: "#4a6b7e",
  relaxed: "#2f5a4a",
  happy: "#6f5210",
  excited: "#86472f",
  none: "#6b736d",
};

export function MoodBadge({ mood, compact = false }: { mood: Mood | null; compact?: boolean }) {
  if (mood === null) {
    return <span className="mood-badge" data-mood="none">{compact ? "—" : "No mood"}</span>;
  }

  return (
    <span className="mood-badge" data-mood={mood}>
      <span aria-hidden="true">{MOOD_ICONS[mood]}</span>
      {compact ? null : MOOD_LABELS[mood]}
    </span>
  );
}
