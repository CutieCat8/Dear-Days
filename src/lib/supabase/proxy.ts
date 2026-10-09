import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { dataMode } from "@/lib/data/config";

/** Pages a signed-out visitor may open. Everything else needs a session. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Runs in proxy.ts before every page: refreshes the Supabase session cookies and redirects by sign-in state.
 * This is a convenience layer (and keeps tokens fresh); every data read/write is authorised again by the data layer
 * and by Row Level Security, so hiding a route here is never the only protection.
 */
export async function updateSession(request: NextRequest) {
  if (dataMode() === "mock") return NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Real mode without keys is a configuration error: say so instead of rendering a broken or demo app.
    return new NextResponse("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).", { status: 500 });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims validates the JWT (signature checked against the project keys) and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/sign-in";
    redirect.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirected = NextResponse.redirect(redirect);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.search = "";
    const redirected = NextResponse.redirect(redirect);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }

  return response;
}
