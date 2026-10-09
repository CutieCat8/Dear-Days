import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { mockRooms } from "@/lib/contracts/fixtures";
import { getCurrentProfile } from "@/lib/data/profile";

// TODO(T6/T19): replace the fixture gallery room with the user's rooms (R11/R12, สิรวิชญ์).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const userName = profile.ok ? profile.data.display_name : "Guest";

  return (
    <AppShell galleryHref={`/rooms/${mockRooms[0].id}/gallery`} userName={userName}>
      {children}
    </AppShell>
  );
}
