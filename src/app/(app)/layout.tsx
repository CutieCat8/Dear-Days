import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getDataSource, getViewer } from "@/lib/data/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const source = await getDataSource();
  const [viewer, rooms] = await Promise.all([getViewer(), source.listRooms()]);
  const firstRoom = rooms.ok ? rooms.data[0] : undefined;

  return (
    <AppShell galleryHref={firstRoom ? `/rooms/${firstRoom.id}/gallery` : "/rooms"} userName={viewer?.display_name ?? "Guest"}>
      {children}
    </AppShell>
  );
}
