"use client";

import * as React from "react";
import * as SubframeCore from "@subframe/core";

import { cn } from "@/lib/utils";

export type ComponentProps = React.ComponentProps<typeof SubframeCore.Calendar> & {
  className?: string;
};

/** Calendar (react-day-picker under the hood), themed with the app's forest-green palette. */
export const Component = React.forwardRef<
  React.ElementRef<typeof SubframeCore.Calendar>,
  ComponentProps
>(function Component({ className, ...otherProps }, ref) {
  return (
    <SubframeCore.Calendar
      ref={ref}
      {...otherProps}
      className={cn("relative", className)}
      classNames={{
        root: "relative box-border",
        months: "relative flex max-w-fit flex-wrap gap-4",
        month: "flex flex-col gap-4",
        nav: "absolute flex h-8 w-full items-center justify-between p-0.5",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "font-display text-sm font-semibold text-[var(--color-green-deep)]",
        button_previous:
          "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent bg-transparent hover:bg-[var(--color-cream-200)] active:bg-[var(--color-sage)] disabled:opacity-40 disabled:hover:bg-transparent",
        button_next:
          "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent bg-transparent hover:bg-[var(--color-cream-200)] active:bg-[var(--color-sage)] disabled:opacity-40 disabled:hover:bg-transparent",
        chevron: "text-[18px] font-medium leading-[18px] text-[var(--color-muted)]",

        weeks: "flex flex-col gap-2",
        weekdays: "flex pb-4",
        weekday: "w-8 text-xs font-semibold text-[var(--color-muted)]",

        week: "flex overflow-hidden rounded-lg",

        day: "group flex h-8 w-8 items-center justify-center text-sm text-[var(--color-ink)]",

        day_button: [
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none",
          "hover:bg-[var(--color-cream-200)]",
          // selected
          "group-[.selected]:bg-[var(--color-button)] group-[.selected]:!text-white",
          // today
          "group-[.today]:font-semibold group-[.today]:text-[var(--color-green)]",
          // days that cannot be picked (e.g. the future)
          "group-[.disabled]:cursor-not-allowed group-[.disabled]:text-[var(--color-muted)]/40 group-[.disabled]:hover:bg-transparent",
          // outside days
          "group-[.outside]:bg-transparent group-[.outside]:text-[var(--color-muted)]/60 group-[.outside]:hover:bg-[var(--color-cream-200)]",
          // range selection states
          "group-[.range-start]:rounded-l-lg group-[.range-end]:rounded-r-lg",
          "group-[.range-middle]:bg-[var(--color-sage)] group-[.range-middle]:text-[var(--color-ink)]",
        ].join(" "),

        selected: "selected",
        today: "today",
        disabled: "disabled",
        outside: "outside",
        range_start: "range-start bg-[var(--color-sage)]",
        range_middle: "range-middle",
        range_end: "range-end bg-[var(--color-sage)]",
      }}
    />
  );
});

export default Component;
