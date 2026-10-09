const DEFAULT_NEXT = "/";
const PROBE_ORIGIN = "http://dear-days.invalid";
const AUTH_PAGES = ["/sign-in", "/sign-up"];

/**
 * The `next` query value as a same-site path (e.g. `/rooms/join?code=AB12CD34`), or `/`.
 * A plain `startsWith("/") && !startsWith("//")` check is not enough: browsers and `new URL()` treat `\` like `/`,
 * so `/\evil.example` resolves to `http://evil.example/`. Parsing against a fixed origin catches that and any
 * other form that leaves the site. Auth pages are refused so sign-in never redirects back to itself.
 */
export function safeNextPath(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/") || value.includes("\\")) return DEFAULT_NEXT;
  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN || AUTH_PAGES.includes(url.pathname)) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}
