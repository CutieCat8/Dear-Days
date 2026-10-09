"use client";

import { useState, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/shared/icons";

type CalendarItem = { month: string; node: ReactNode };

/** Shows only the active month until the viewer expands the list of all months. */
export function CalendarStack({ items, activeMonth }: { items: CalendarItem[]; activeMonth: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.filter((item) => item.month === activeMonth).slice(0, 1);
  const shown = visible.length ? visible : items.slice(0, 1);

  return (
    <div className="min-w-0">
      <button
        aria-controls="calendar-months"
        aria-expanded={expanded}
        className="btn btn-secondary btn-sm mb-3 w-full justify-between"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Show current month only" : `Show all months (${items.length})`}
        <ChevronDownIcon className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className={expanded ? "lg:max-h-[calc(100dvh-9.5rem)] lg:overflow-y-auto lg:pr-1" : ""} id="calendar-months">
        <ol className="grid gap-3">
          {shown.map((item) => <li key={item.month}>{item.node}</li>)}
        </ol>
      </div>
    </div>
  );
}
