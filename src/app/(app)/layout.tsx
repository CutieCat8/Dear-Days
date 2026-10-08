import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { mockRooms } from "@/lib/contracts/fixtures";

// TODO(T5/T19): replace fixture room/user with the authenticated session.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell galleryHref={`/rooms/${mockRooms[0].id}/gallery`} userName="Sea">
      {children}
    </AppShell>
  );
}
