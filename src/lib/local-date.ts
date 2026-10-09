/**
 * Calendar date (YYYY-MM-DD) as the person sees it. `new Date().toISOString().slice(0, 10)` is the UTC date, which is
 * the previous day in Asia/Bangkok between 00:00 and 07:00. `timeZone` is only for tests; the default is the device zone.
 */
export function localDateString(now: Date = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
