import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DearDaysDataSource } from "../src/lib/contracts/data-functions";
import { mockMemories } from "../src/lib/contracts/fixtures";
import type { DataResult, Memory, MemoryListParams, Paginated } from "../src/lib/contracts/types";
import { MockDataSource } from "../src/lib/data/mock-source";
import { buildBook, pagesOfSpread, spreadCount, spreadOfPage } from "../src/lib/books/outline";
import { currentYearMonth, groupByMonth, memoriesInMonth, monthGrid, monthRange, sortOldestFirst, yearMonthOf, yearOptions, yearRange } from "../src/lib/books/period";
import { bookSize, calendarHeight, contentsCapacity, pageMetrics } from "../src/lib/books/metrics";
import { autoPull, corner, curl, limitPull } from "../src/lib/books/curl";
import { MAX_FRAME_PHOTOS, photoTemplate, photosNeedOwnPage, placePhotos } from "../src/lib/books/photo-layout";
import { listAllMemories } from "../src/lib/books/range";
import { yearStats } from "../src/lib/books/stats";
import { splitTextIntoPages } from "../src/lib/books/text-pages";

const ROOM = mockMemories[0].room_id;
const make = (id: string, date: string, extra: Partial<Memory> = {}): Memory => ({ ...mockMemories[0], id, memory_date: date, created_at: `${date}T10:00:00.000Z`, media: [], cover_media_id: null, tags: [], mood: null, ...extra });

describe("period helpers", () => {
  it("takes the month from the date text, so no time zone can move a memory to another month", () => {
    assert.deepEqual(yearMonthOf("2026-10-01"), { year: 2026, month: 10 });
    assert.deepEqual(yearMonthOf("2026-01-31"), { year: 2026, month: 1 });
    const memories = [make("a", "2026-09-30"), make("b", "2026-10-01"), make("c", "2026-10-31"), make("d", "2026-11-01")];
    assert.deepEqual(memoriesInMonth(memories, { year: 2026, month: 10 }).map((m) => m.id), ["b", "c"]);
    assert.deepEqual(groupByMonth(memories).map((month) => month.length), [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0]);
  });

  it("builds inclusive month and year ranges, including leap years and 30-day months", () => {
    assert.deepEqual(monthRange({ year: 2026, month: 2 }), { from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(monthRange({ year: 2028, month: 2 }), { from: "2028-02-01", to: "2028-02-29" });
    assert.deepEqual(monthRange({ year: 2026, month: 11 }), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(yearRange(2026), { from: "2026-01-01", to: "2026-12-31" });
    assert.deepEqual(monthGrid({ year: 2026, month: 10 }), { leading: 4, days: 31 }); // 1 Oct 2026 is a Thursday
  });

  it("starts at the person's current month, not the UTC month", () => {
    // 02:00 UTC on 1 Nov is still 31 Oct in New York and already 1 Nov in Bangkok
    const now = new Date("2026-11-01T02:00:00Z");
    assert.deepEqual(currentYearMonth(now, "America/New_York"), { year: 2026, month: 10 });
    assert.deepEqual(currentYearMonth(now, "Asia/Bangkok"), { year: 2026, month: 11 });
    // 17:30 UTC on 31 Oct is already 1 Nov at 00:30 in Bangkok
    assert.deepEqual(currentYearMonth(new Date("2026-10-31T17:30:00Z"), "Asia/Bangkok"), { year: 2026, month: 11 });
  });

  it("sorts oldest first with a stable order for the same day", () => {
    const sorted = sortOldestFirst([make("b", "2026-10-02"), make("a", "2026-10-02"), make("c", "2026-10-01")]);
    assert.deepEqual(sorted.map((m) => m.id), ["c", "a", "b"]);
  });

  it("year options always contain the selected year and the data's years", () => {
    const options = yearOptions([2024], 2031, { year: 2026, month: 10 });
    assert.ok(options.includes(2031) && options.includes(2024) && options.includes(2026));
    assert.deepEqual(options, [...options].sort((a, b) => b - a));
  });
});

describe("listAllMemories", () => {
  const many: Memory[] = Array.from({ length: 120 }, (_, index) => make(`m${String(index).padStart(3, "0")}`, `2026-10-${String((index % 28) + 1).padStart(2, "0")}`));

  function pagedSource(items: Memory[], calls: MemoryListParams[] = []): DearDaysDataSource {
    return {
      async listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>> {
        calls.push(params);
        const page = params.page ?? 1;
        const size = params.page_size ?? 20;
        return { ok: true, data: { items: items.slice((page - 1) * size, page * size), page, page_size: size, total: items.length, has_more: page * size < items.length } };
      },
    } as unknown as DearDaysDataSource;
  }

  it("reads every page, not just the first", async () => {
    const calls: MemoryListParams[] = [];
    const result = await listAllMemories(pagedSource(many, calls), { room_id: ROOM, date_from: "2026-10-01", date_to: "2026-10-31" });
    assert.ok(result.ok);
    assert.equal(result.data.length, 120);
    assert.equal(calls.length, 3);
    assert.ok(calls.every((call) => call.page_size === 50 && call.date_from === "2026-10-01" && call.date_to === "2026-10-31"));
  });

  it("returns the error and no partial book when a later page fails", async () => {
    let calls = 0;
    const source = {
      async listMemories(): Promise<DataResult<Paginated<Memory>>> {
        calls += 1;
        if (calls === 2) return { ok: false, error: { code: "INTERNAL_ERROR", message: "boom" } };
        return { ok: true, data: { items: many.slice(0, 50), page: calls, page_size: 50, total: 120, has_more: true } };
      },
    } as unknown as DearDaysDataSource;
    const result = await listAllMemories(source, { room_id: ROOM });
    assert.equal(result.ok, false);
  });

  it("never shows a memory twice if the list shifts between pages", async () => {
    let calls = 0;
    const source = {
      async listMemories(): Promise<DataResult<Paginated<Memory>>> {
        calls += 1;
        const items = calls === 1 ? many.slice(0, 3) : many.slice(2, 5);
        return { ok: true, data: { items, page: calls, page_size: 50, total: 5, has_more: calls === 1 } };
      },
    } as unknown as DearDaysDataSource;
    const result = await listAllMemories(source, { room_id: ROOM });
    assert.ok(result.ok);
    assert.deepEqual(result.data.map((m) => m.id), ["m000", "m001", "m002", "m003", "m004"]);
  });

  it("works on the demo source and respects the date range", async () => {
    const result = await listAllMemories(new MockDataSource(), { room_id: ROOM, date_from: "2026-10-01", date_to: "2026-10-31" });
    assert.ok(result.ok);
    assert.ok(result.data.length > 0 && result.data.every((m) => m.memory_date.startsWith("2026-10-")));
  });
});

describe("year statistics", () => {
  it("counts memories, photos, months, moods and tags from the data", () => {
    const [sea, cafe] = [mockMemories[0].tags[0], mockMemories[0].tags[3]];
    const memories = [
      make("a", "2026-01-05", { mood: "happy", media: mockMemories[0].media.slice(0, 1), tags: [sea] }),
      make("b", "2026-01-20", { mood: "happy", tags: [sea, cafe] }),
      make("c", "2026-03-02", { mood: "sad" }),
    ];
    const stats = yearStats(memories);
    assert.equal(stats.memories, 3);
    assert.equal(stats.photos, 1);
    assert.equal(stats.activeMonths, 2);
    assert.deepEqual(stats.busiestMonth, { month: 1, count: 2 });
    assert.deepEqual(stats.topMood, { mood: "happy", count: 2 });
    assert.equal(stats.people + stats.places, 2);
  });

  it("an empty year has zero counts and no busiest month", () => {
    const stats = yearStats([]);
    assert.deepEqual([stats.memories, stats.photos, stats.activeMonths, stats.busiestMonth, stats.topMood], [0, 0, 0, null, null]);
  });
});

describe("photo frame layout", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it("8 photos: three small, two large, three small, in the original order", () => {
    const columns = placePhotos(ids(8));
    assert.deepEqual(columns.map((column) => column.photos), [[1, 2, 3], [4, 5], [6, 7, 8]]);
    assert.ok(columns[1].span > columns[0].span, "the middle column is the wider, larger one");
    assert.equal(columns[0].span, columns[2].span);
  });

  it("every count from 1 to 8 shows each photo exactly once", () => {
    for (let count = 1; count <= MAX_FRAME_PHOTOS; count += 1) {
      const placed = placePhotos(ids(count)).flatMap((column) => column.photos);
      assert.deepEqual(placed, ids(count), `${count} photos`);
      const template = photoTemplate(count)!;
      assert.equal(template.columns.reduce((sum, column) => sum + column.rows, 0), count, `${count} cells for ${count} photos`);
    }
  });

  it("has no frame for no photos and never repeats a photo to fill a cell", () => {
    assert.deepEqual(placePhotos([]), []);
    assert.equal(photoTemplate(0), null);
  });

  it("gives many photos their own page only on narrow pages", () => {
    assert.equal(photosNeedOwnPage(8, true), true);
    assert.equal(photosNeedOwnPage(8, false), false);
    assert.equal(photosNeedOwnPage(4, true), false);
  });
});

describe("splitTextIntoPages", () => {
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
  const capacity = (first: number, rest: number) => (candidate: string, page: number) => candidate.length <= (page === 0 ? first : rest);

  it("keeps all the text, in order, across pages", () => {
    const pages = splitTextIntoPages(words, capacity(120, 300));
    assert.ok(pages.length > 3);
    assert.equal(pages.join(" ").split(/\s+/).join(" "), words);
    assert.ok(pages[0].length <= 120 && pages.slice(1).every((page) => page.length <= 300));
  });

  it("a short text stays on one page", () => {
    assert.deepEqual(splitTextIntoPages("Nothing happened today.", capacity(120, 300)), ["Nothing happened today."]);
  });

  it("keeps paragraphs and line breaks inside a page", () => {
    const pages = splitTextIntoPages("one\n\ntwo three", capacity(100, 100));
    assert.deepEqual(pages, ["one\n\ntwo three"]);
  });

  it("breaks a word longer than a page instead of losing or overflowing it", () => {
    const long = "x".repeat(250);
    const pages = splitTextIntoPages(long, capacity(50, 100));
    assert.equal(pages.join(""), long);
    assert.ok(pages[0].length <= 50 && pages.slice(1).every((page) => page.length <= 100));
  });

  it("a first page with no room for text passes everything on", () => {
    const pages = splitTextIntoPages("a few words here", (candidate, page) => page > 0 && candidate.length <= 100);
    assert.deepEqual(pages, ["", "a few words here"]);
  });

  it("can keep the photos page free of text", () => {
    const pages = splitTextIntoPages("a few words here", capacity(100, 100), false);
    assert.deepEqual(pages, ["", "a few words here"]);
  });

  it("always makes progress even if nothing fits", () => {
    const pages = splitTextIntoPages("abc def", () => false);
    assert.equal(pages.join(""), "abcdef");
  });

  it("never starts a page with blank space, and handles thai text without spaces", () => {
    const thai = "วันนี้เป็นวันที่ดีมาก ".repeat(60).trim();
    const pages = splitTextIntoPages(thai, capacity(80, 120));
    assert.ok(pages.every((page) => page === page.trim()));
    assert.equal(pages.join(" ").replace(/\s+/g, ""), thai.replace(/\s+/g, ""));
  });
});

describe("book layout", () => {
  const capacity = { calendarFirst: 4, first: 10, rest: 12 };
  const textPages = (memory: Memory) => (memory.id.startsWith("long") ? ["first", "second", "third"] : ["only"]);

  it("an empty period has a cover and an empty page, nothing invented", () => {
    const book = buildBook({ kind: "monthly", period: { year: 2026, month: 5 }, memories: [] }, { capacity, textPages });
    assert.deepEqual(book.pages.map((page) => page.type), ["cover", "empty"]);
  });

  it("monthly: cover, calendar contents, memories, closing; anchors point at the right pages", () => {
    const memories = [make("b", "2026-10-09"), make("long-a", "2026-10-03"), make("c", "2026-10-09")];
    const book = buildBook({ kind: "monthly", period: { year: 2026, month: 10 }, memories }, { capacity, textPages });
    assert.deepEqual(book.pages.map((page) => page.type), ["cover", "contents", "memory", "memory", "memory", "memory", "memory", "closing"]);
    assert.equal(book.memoryPage.get("long-a"), 2);
    assert.equal(book.memoryPage.get("b"), 5);
    assert.equal(book.memoryPage.get("c"), 6);
    assert.equal(book.dayPage.get("2026-10-09"), 5);
    const contents = book.pages[1];
    assert.ok(contents.type === "contents" && contents.calendar && contents.entries.map((entry) => entry.page).join() === "2,5,6");
  });

  it("a long contents list continues on further pages without losing an entry", () => {
    const memories = Array.from({ length: 30 }, (_, i) => make(`m${i}`, `2026-10-${String(i + 1).padStart(2, "0")}`));
    const book = buildBook({ kind: "highlights", filter: { year: 2026, month: 10 }, memories }, { capacity, textPages });
    const contents = book.pages.filter((page) => page.type === "contents");
    assert.equal(contents.length, 3);
    assert.equal(contents.flatMap((page) => (page.type === "contents" ? page.entries : [])).length, 30);
    const firstMemoryPage = book.pages.findIndex((page) => page.type === "memory");
    assert.equal(book.memoryPage.get("m0"), firstMemoryPage);
    assert.equal(book.pages[book.memoryPage.get("m7")!].type, "memory");
  });

  it("yearbook: months of the year with dividers, stats and month overview pages", () => {
    const memories = [make("jan", "2026-01-10"), make("mar-1", "2026-03-02"), make("mar-2", "2026-03-30")];
    const book = buildBook({ kind: "yearbook", year: 2026, memories }, { capacity: { ...capacity, first: 12 }, textPages });
    assert.deepEqual(book.pages.map((page) => page.type), ["cover", "contents", "stats", "month-grid", "month-divider", "memory", "month-divider", "memory", "memory", "closing"]);
    assert.equal(book.monthPage.get(1), 4);
    assert.equal(book.monthPage.get(3), 6);
    assert.equal(book.monthPage.has(2), false);
    const contents = book.pages[1];
    assert.ok(contents.type === "contents");
    assert.equal(contents.entries.length, 12);
    assert.equal(contents.entries[1].page, null, "an empty month leads nowhere");
    assert.equal(contents.entries[2].page, 6);
    assert.equal(contents.entries[2].detail, "2 memories");
  });

  it("spreads: the cover is alone, then pages pair up", () => {
    assert.equal(spreadCount(1, true), 1);
    assert.equal(spreadCount(2, true), 2);
    assert.equal(spreadCount(8, true), 5);
    assert.deepEqual([0, 1, 2, 3, 4].map((spread) => pagesOfSpread(spread, 8, true)), [[null, 0], [1, 2], [3, 4], [5, 6], [7, null]]);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((page) => spreadOfPage(page, true)), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
    assert.deepEqual(pagesOfSpread(3, 8, false), [null, 3]);
    assert.equal(spreadOfPage(5, false), 5);
  });
});

describe("page metrics", () => {
  it("sizes one page or two pages to the free space without overflowing it", () => {
    const wide = bookSize({ width: 1500, height: 820 }, true);
    assert.ok(wide.pageW * 2 <= 1500 && wide.pageH <= 820);
    const narrow = bookSize({ width: 900, height: 900 }, true);
    assert.ok(narrow.pageW * 2 <= 900);
    const phone = bookSize({ width: 366, height: 700 }, false);
    assert.deepEqual(phone, { pageW: 366, pageH: 700 });
  });

  it("phone-sized pages are compact, desktop pages are not", () => {
    assert.equal(pageMetrics(366, 700).compact, true);
    assert.equal(pageMetrics(560, 778).compact, false);
  });

  it("the contents list always has room for at least one line per page, and less room under a calendar", () => {
    for (const [w, h] of [[560, 778], [366, 700], [300, 480], [200, 300]] as const) {
      const capacity = contentsCapacity(pageMetrics(w, h), 6);
      assert.ok(capacity.rest >= 1 && capacity.first >= capacity.calendarFirst && capacity.calendarFirst >= 0, `${w}x${h}`);
    }
    const desktop = contentsCapacity(pageMetrics(560, 778), 5);
    assert.equal(desktop.first, 16);
    assert.equal(desktop.calendarFirst, 10);
    assert.equal(calendarHeight(5), 236);
  });
});

describe("page curl geometry", () => {
  const W = 500;
  const H = 700;
  const near = (a: number, b: number, label: string) => assert.ok(Math.abs(a - b) < 1e-6, `${label}: ${a} vs ${b}`);

  it("a sheet that is not pulled stays flat and whole", () => {
    const g = curl({ x: W, y: H }, "next", W, H, H);
    assert.equal(g.flat, true);
    assert.equal(g.flat_polygon.length, 4);
    assert.equal(g.progress, 0);
  });

  it("pulled all the way, the next sheet lies exactly on the left page, back face upright", () => {
    const g = curl({ x: -W, y: H }, "next", W, H, H);
    const area = Math.abs(g.flat_polygon.reduce((sum, q, i) => { const r = g.flat_polygon[(i + 1) % g.flat_polygon.length]; return sum + (q.x * r.y - r.x * q.y); }, 0)) / 2;
    near(area, 0, "nothing is left lying flat");
    const xs = g.flap_polygon.map((q) => q.x);
    near(Math.min(...xs), -W, "left edge");
    near(Math.max(...xs), 0, "right edge");
    const [a, b, c, d, e, f] = g.matrix;
    [a, b, c, d, e, f].forEach((value, i) => near(value, [1, 0, 0, 1, -W, 0][i], `matrix[${i}]`));
    assert.equal(g.progress, 1);
  });

  it("pulled all the way, the previous sheet lies exactly on the right page", () => {
    const g = curl({ x: W, y: 0 }, "prev", W, H, 0);
    const xs = g.flap_polygon.map((q) => q.x);
    near(Math.min(...xs), 0, "left edge");
    near(Math.max(...xs), W, "right edge");
    [1, 0, 0, 1, 0, 0].forEach((value, i) => near(g.matrix[i], value, `matrix[${i}]`));
  });

  it("midway, the pulled corner is where the hand is and the fold splits the sheet in two", () => {
    const hand = { x: 120, y: 520 };
    const g = curl(hand, "next", W, H, H);
    assert.equal(g.flat, false);
    assert.ok(g.flat_polygon.length >= 3 && g.flap_polygon.length >= 3);
    // the flap contains the corner's image, which is the hand
    assert.ok(g.flap_polygon.some((q) => Math.hypot(q.x - hand.x, q.y - hand.y) < 1e-6));
    // the back face's top-right corner (u = W, v = H) lands on the hand too
    const [a, b, c, d, e, f] = g.matrix;
    const landed = { x: a * 0 + c * H + e, y: b * 0 + d * H + f }; // u = 0 is the sheet's free edge
    near(landed.x, hand.x, "free edge x");
    near(landed.y, hand.y, "free edge y");
  });

  it("the pulled corner cannot stretch the sheet or go outwards", () => {
    const far = limitPull({ x: -5000, y: 5000 }, "next", W, H, H);
    assert.ok(Math.hypot(far.x, far.y - H) <= W + 1e-6);
    assert.equal(limitPull({ x: 900, y: H }, "next", W, H, H).x, W);
    assert.equal(limitPull({ x: -900, y: H }, "prev", W, H, H).x, -W);
  });

  it("the sheet stays hinged to the whole spine however the corner is pulled", () => {
    for (const [direction, cornerY] of [["next", H], ["next", 0], ["prev", H], ["prev", 0]] as const) {
      const c = corner(direction, W, cornerY);
      for (const pull of [{ x: 0, y: H * 3 }, { x: 0, y: -H * 2 }, { x: c.x / 2, y: H * 2 }, { x: -c.x, y: -H }, { x: 0, y: cornerY }]) {
        const p = limitPull(pull, direction, W, cornerY, H);
        for (const sy of [0, H / 4, H / 2, (3 * H) / 4, H]) {
          assert.ok(Math.hypot(p.x, p.y - sy) <= Math.hypot(c.x, c.y - sy) + 1e-6, `${direction}/${cornerY} spine point ${sy}`);
        }
        // every spine point stays on the flat side of the fold
        const g = curl(pull, direction, W, H, cornerY);
        if (!g.flat) {
          for (const sy of [0, H]) assert.ok((0 - g.mid.x) * g.normal.x + (sy - g.mid.y) * g.normal.y >= -1e-6);
        }
      }
    }
  });

  it("a turn started by a button runs from the corner to the other page", () => {
    const start = autoPull(0, "next", W, H, H);
    const end = autoPull(1, "next", W, H, H);
    assert.deepEqual([start.x, start.y], [W, H]);
    near(end.x, -W, "end x");
    near(end.y, H, "end y");
    const back = autoPull(1, "prev", W, H, 0);
    near(back.x, W, "prev end x");
  });
});
