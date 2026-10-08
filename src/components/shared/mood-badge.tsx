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

export function MoodBadge({ mood, compact = false }: { mood: Mood | null; compact?: boolean }) {
  if (mood === null) {
    return <span className="mood-badge" data-mood="none">{compact ? "—" : "ไม่ได้เลือกมู้ด"}</span>;
  }

  return (
    <span className="mood-badge" data-mood={mood}>
      <span aria-hidden="true">{MOOD_ICONS[mood]}</span>
      {compact ? null : MOOD_LABELS[mood]}
    </span>
  );
}
