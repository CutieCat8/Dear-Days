export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const AUTH_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH] as const;
export const DEFAULT_AFTER_SIGN_IN = "/";

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Returns `next` only when it is a same-site path (e.g. `/rooms/join?code=ABCD1234`), otherwise the default.
 * Blocks open redirects such as `//evil.com`, `/\evil.com` and absolute URLs, and loops back to auth pages.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  try {
    const url = new URL(next, "http://dear-days.local");
    if (url.origin !== "http://dear-days.local" || isAuthPath(url.pathname)) return DEFAULT_AFTER_SIGN_IN;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}

/** `/sign-in?next=...`, omitting `next` when it would just be the default page. */
export function authPathWithNext(authPath: string, next: string) {
  const target = safeNextPath(next);
  return target === DEFAULT_AFTER_SIGN_IN ? authPath : `${authPath}?next=${encodeURIComponent(target)}`;
}
