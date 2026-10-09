import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Tag } from "../src/lib/contracts/types";
import { buildGalleryHref, parseGalleryFilters } from "../src/lib/gallery/filters";

const ROOM_ID = "10000000-0000-4000-8000-000000000001";
const PERSON_ID = "20000000-0000-4000-8000-000000000001";
const PLACE_ID = "30000000-0000-4000-8000-000000000001";
const UNKNOWN_ID = "40000000-0000-4000-8000-000000000001";

const tags: Tag[] = [
  { id: PERSON_ID, room_id: ROOM_ID, type: "person", label: "Mint", created_at: "2026-10-01T00:00:00.000Z" },
  { id: PLACE_ID, room_id: ROOM_ID, type: "place", label: "Cafe", created_at: "2026-10-01T00:00:00.000Z" },
];

describe("Gallery filters", () => {
  it("parses repeated moods including no-mood and restricts tag ids to this room", () => {
    const filters = parseGalleryFilters({
      q: "  cafe  ",
      mood: ["happy", "none", "invalid", "happy"],
      date_from: "2026-10-01",
      person_tag_ids: [PERSON_ID, UNKNOWN_ID],
      place_tag_ids: [PLACE_ID],
      sort: "memory_date_asc",
      page: "2",
    }, tags);

    assert.equal(filters.query, "cafe");
    assert.deepEqual(filters.moods, ["happy", null]);
    assert.deepEqual(filters.personTagIds, [PERSON_ID]);
    assert.deepEqual(filters.placeTagIds, [PLACE_ID]);
    assert.equal(filters.dateFrom, "2026-10-01");
    assert.equal(filters.sort, "memory_date_asc");
    assert.equal(filters.page, 2);
  });

  it("preserves active filters in calendar and pagination links", () => {
    const filters = parseGalleryFilters({
      mood: ["none"],
      person_tag_ids: [PERSON_ID],
      sort: "updated_at_desc",
    }, tags);
    const href = new URL(buildGalleryHref(ROOM_ID, filters, { page: 3, day: "2026-10-10" }), "https://deardays.test");

    assert.equal(href.searchParams.get("page"), "3");
    assert.equal(href.searchParams.get("day"), "2026-10-10");
    assert.deepEqual(href.searchParams.getAll("mood"), ["none"]);
    assert.deepEqual(href.searchParams.getAll("person_tag_ids"), [PERSON_ID]);
    assert.equal(href.searchParams.get("sort"), "updated_at_desc");
  });

  it("preserves the current page when a calendar date is selected", () => {
    const filters = parseGalleryFilters({ page: "2" }, tags);
    const href = new URL(buildGalleryHref(ROOM_ID, filters, { day: "2026-10-10" }), "https://deardays.test");

    assert.equal(href.searchParams.get("page"), "2");
    assert.equal(href.searchParams.get("day"), "2026-10-10");
  });

  it("falls back to safe page and sort values", () => {
    const filters = parseGalleryFilters({ page: "-2", sort: "newest" }, tags);

    assert.equal(filters.page, 1);
    assert.equal(filters.sort, "memory_date_desc");
  });

  it("drops invalid or reversed date ranges instead of sending invalid filters to the data layer", () => {
    const invalidDate = parseGalleryFilters({ date_from: "2026-02-30" }, tags);
    const reversedRange = parseGalleryFilters({ date_from: "2026-10-20", date_to: "2026-10-01" }, tags);

    assert.equal(invalidDate.dateFrom, "");
    assert.equal(invalidDate.dateRangeInvalid, false);
    assert.equal(reversedRange.dateFrom, "");
    assert.equal(reversedRange.dateTo, "");
    assert.equal(reversedRange.dateRangeInvalid, true);
  });
});