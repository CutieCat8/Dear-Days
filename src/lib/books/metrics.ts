/**
 * Pixel sizes shared by the page CSS and the page-count math. The reader sets the page size; everything inside a page
 * (padding, footer, table-of-contents rows, calendar) uses these numbers, so how many lines fit is computed, not guessed.
 * Keep them in sync with `books.module.css` (they are handed to it as CSS variables).
 */
export const PAGE_RATIO = 0.72; // width / height of one page
export const COMPACT_BELOW = 400; // pages narrower than this get the phone-sized layouts
export const FOOT = 26; // page number line
export const TITLE_BLOCK = 60; // "Contents" heading (36) + its margin (14) + the gap before the next block (10)
export const TOC_ROW = 38;
export const CALENDAR = { head: 30, weekdays: 22, row: 32, gap: 24 }; // gap: margin under the grid (14) + flex gap (10)

export type PageMetrics = {
  pageW: number;
  pageH: number;
  compact: boolean;
  pad: number;
  /** Space inside the page padding and above the page number. */
  innerW: number;
  innerH: number;
};

export function pageMetrics(pageW: number, pageH: number): PageMetrics {
  const compact = pageW < COMPACT_BELOW;
  const pad = compact ? 18 : 30;
  return { pageW, pageH, compact, pad, innerW: pageW - pad * 2, innerH: Math.max(0, pageH - pad * 2 - FOOT) };
}

export function calendarHeight(weeks: number): number {
  return CALENDAR.head + CALENDAR.weekdays + weeks * CALENDAR.row + CALENDAR.gap;
}

/** Table-of-contents lines that fit on a page: under the calendar, alone, and on continuation pages. */
export function contentsCapacity(metrics: PageMetrics, weeks: number): { calendarFirst: number; first: number; rest: number } {
  const rows = (height: number) => Math.max(0, Math.floor(height / TOC_ROW));
  const room = metrics.innerH - TITLE_BLOCK;
  return {
    calendarFirst: rows(room - calendarHeight(weeks)),
    first: rows(room),
    rest: Math.max(1, rows(room)),
  };
}

/** The page size for the space the reader leaves free: two pages side by side, or one. */
export function bookSize(available: { width: number; height: number }, double: boolean): { pageW: number; pageH: number } {
  const maxH = Math.max(320, available.height);
  const maxW = Math.max(260, available.width);
  if (double) {
    let pageH = Math.min(maxH, 780);
    let pageW = Math.round(pageH * PAGE_RATIO);
    if (pageW * 2 > maxW) {
      pageW = Math.floor(maxW / 2);
      pageH = Math.round(pageW / PAGE_RATIO);
    }
    return { pageW, pageH };
  }
  return { pageW: Math.min(maxW, 520), pageH: maxH };
}
