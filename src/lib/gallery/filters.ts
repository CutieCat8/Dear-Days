import { MOODS } from "../contracts/constants";
import type { Mood, Tag } from "../contracts/types";

export const NO_MOOD_VALUE = "none";

const SORT_OPTIONS = ["memory_date_desc", "memory_date_asc", "updated_at_desc"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type GallerySort = (typeof SORT_OPTIONS)[number];
export type GallerySearchParams = Record<string, string | string[] | undefined>;

export type GalleryFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  moods: (Mood | null)[];
  personTagIds: string[];
  placeTagIds: string[];
  sort: GallerySort;
  page: number;
  dateRangeInvalid: boolean;
};

function values(searchParams: GallerySearchParams, key: string): string[] {
  const value = searchParams[key];
  if (typeof value === "string") return value ? [value] : [];
  return (value ?? []).filter(Boolean);
}

function firstValue(searchParams: GallerySearchParams, key: string): string {
  return values(searchParams, key)[0] ?? "";
}

function validDate(value: string): string {
  if (!DATE_PATTERN.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? "" : value;
}

export function parseGalleryFilters(searchParams: GallerySearchParams, tags: Tag[]): GalleryFilters {
  const selectedMoods = new Set(values(searchParams, "mood"));
  const moods = [...selectedMoods]
    .filter((mood) => mood === NO_MOOD_VALUE || (MOODS as readonly string[]).includes(mood))
    .map((mood) => mood === NO_MOOD_VALUE ? null : mood as Mood);
  const people = new Set(tags.filter((tag) => tag.type === "person").map((tag) => tag.id));
  const places = new Set(tags.filter((tag) => tag.type === "place").map((tag) => tag.id));
  const requestedPage = firstValue(searchParams, "page");
  const parsedPage = /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
  const requestedSort = firstValue(searchParams, "sort");
  const requestedDateFrom = validDate(firstValue(searchParams, "date_from"));
  const requestedDateTo = validDate(firstValue(searchParams, "date_to"));
  const dateRangeInvalid = Boolean(requestedDateFrom && requestedDateTo && requestedDateFrom > requestedDateTo);

  return {
    query: firstValue(searchParams, "q").trim(),
    dateFrom: dateRangeInvalid ? "" : requestedDateFrom,
    dateTo: dateRangeInvalid ? "" : requestedDateTo,
    moods,
    personTagIds: values(searchParams, "person_tag_ids").filter((id) => people.has(id)),
    placeTagIds: values(searchParams, "place_tag_ids").filter((id) => places.has(id)),
    sort: SORT_OPTIONS.includes(requestedSort as GallerySort) ? requestedSort as GallerySort : "memory_date_desc",
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    dateRangeInvalid,
  };
}

export function firstGalleryValue(searchParams: GallerySearchParams, key: string): string {
  return firstValue(searchParams, key);
}

export function buildGalleryHref(
  roomId: string,
  filters: GalleryFilters,
  overrides: { page?: number; day?: string; memory?: string } = {},
): string {
  const query = new URLSearchParams();
  if (filters.query) query.set("q", filters.query);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  for (const mood of filters.moods) query.append("mood", mood ?? NO_MOOD_VALUE);
  for (const id of filters.personTagIds) query.append("person_tag_ids", id);
  for (const id of filters.placeTagIds) query.append("place_tag_ids", id);
  if (filters.sort !== "memory_date_desc") query.set("sort", filters.sort);
  const page = overrides.page ?? filters.page;
  if (page > 1) query.set("page", String(page));
  if (overrides.day) query.set("day", overrides.day);
  if (overrides.memory) query.set("memory", overrides.memory);

  const queryString = query.toString();
  return `/rooms/${roomId}/gallery${queryString ? `?${queryString}` : ""}`;
}