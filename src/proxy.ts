import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SIGN_IN_PATH, authPathWithNext, isAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getSupabaseConfig } from "@/lib/supabase/config";

// Refreshes the Supabase session cookie on every page request and guards routes:
// signed-out visitors go to /sign-in (keeping where they were headed), signed-in users skip the auth pages.
// Server Actions and data functions must still check the session themselves; this is not the only guard.
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  // Mock mode (no Supabase env yet): let everything through so the UI can be developed against fixtures.
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT; never trust getSession() alone on the server.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  let destination: string | null = null;
  if (!signedIn && !isAuthPath(pathname)) destination = authPathWithNext(SIGN_IN_PATH, `${pathname}${search}`);
  if (signedIn && isAuthPath(pathname)) destination = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (!destination) return response;

  // Keep any refreshed session cookies on the redirect.
  const redirect = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Every page except Next internals and static files (images, icons, fonts).
    "/((?!_next/static|_next/image|\\.well-known|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
