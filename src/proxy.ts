import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // everything except static files and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mock/|covers/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
