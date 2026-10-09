"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { ChartIcon } from "@/components/shared/icons";
import { MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import type { Mood } from "@/lib/contracts/types";
import { MOOD_RANGES, type ProfileOverview } from "@/lib/data/profile-overview";

// Dot and bar colors follow the Profile mockup; the text labels carry the meaning.
const MOOD_COLORS: Record<Mood, { dot: string; bar: string }> = {
  awful: { dot: "#a3a7a2", bar: "#d9dbd6" },
  stressed: { dot: "#d98a5f", bar: "#f1c9b2" },
  sad: { dot: "#6f9cc4", bar: "#b8d0e6" },
  relaxed: { dot: "#6f9a6a", bar: "#bcd6b4" },
  happy: { dot: "#e9c46f", bar: "#f6dd8a" },
  excited: { dot: "#e48aa6", bar: "#f5c1d1" },
};

const RANGE_LABELS: Record<(typeof MOOD_RANGES)[number], string> = { 1: "Last month", 3: "Last 3 months", 6: "Last 6 months", 12: "Last 12 months" };

export function MoodOverview({ mood }: { mood: ProfileOverview["mood"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const max = Math.max(1, ...MOODS.map((value) => mood.counts[value]));
  const total = MOODS.reduce((sum, value) => sum + mood.counts[value], 0);

  return (
    <section aria-labelledby="mood-overview-title" className="panel grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="title-md flex items-center gap-2" id="mood-overview-title"><ChartIcon className="size-4" /> Mood overview <small className="font-sans text-xs font-normal text-[var(--color-muted)]">(optional)</small></h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">A simple look at how you&apos;ve been feeling.<br />This is just a personal reflection — not a medical diagnosis.</p>
        </div>
        <label className="sr-only" htmlFor="mood-range">Time range</label>
        <select
          className="field-input !min-h-9 !w-auto !py-1 text-xs"
          disabled={pending}
          id="mood-range"
          onChange={(event) => startTransition(() => router.replace(`${pathname}?months=${event.target.value}`, { scroll: false }))}
          value={mood.months}
        >
          {MOOD_RANGES.map((months) => <option key={months} value={months}>{RANGE_LABELS[months]}</option>)}
        </select>
      </div>

      <ul aria-busy={pending} className={`grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-6 ${pending ? "opacity-60" : ""}`}>
        {MOODS.map((value) => {
          const count = mood.counts[value];
          return (
            <li className="flex flex-col items-center gap-2 bg-[var(--color-paper)] px-2 py-3 text-center" key={value}>
              <span className="text-[0.72rem] font-medium text-[var(--color-ink)]">{MOOD_LABELS[value]}</span>
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: MOOD_COLORS[value].dot }} />
              <span aria-hidden="true" className="flex h-12 w-full items-end justify-center">
                <span className="w-3/4 rounded-md" style={{ background: MOOD_COLORS[value].bar, height: count ? `${Math.max(12, (count / max) * 100)}%` : "3px" }} />
              </span>
              <span className="text-xs text-[var(--color-muted)]"><span className="sr-only">{MOOD_LABELS[value]}: </span>{count}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[0.7rem] text-[var(--color-muted)]">
        {total ? `${total} ${total === 1 ? "memory" : "memories"} with a mood` : "No memories with a mood in this period yet"}
        {mood.withoutMood ? ` · ${mood.withoutMood} without a mood` : ""}
      </p>
    </section>
  );
}
