import Link from "next/link";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { MemoryForm } from "@/components/features/memory/memory-form";
import { getMemory, listTags } from "@/lib/data/memories";
import { unwrapForPage } from "@/lib/data/page-guards";
import { getCurrentProfile } from "@/lib/data/profile";
import { getRoom } from "@/lib/data/rooms";

type EditMemoryPageProps = {
  params: Promise<{ roomId: string; memoryId: string }>;
};

export default async function EditMemoryPage({ params }: EditMemoryPageProps) {
  const { roomId, memoryId } = await params;
  const room = unwrapForPage(await getRoom(roomId));
  const memory = unwrapForPage(await getMemory(roomId, memoryId));
  const profile = unwrapForPage(await getCurrentProfile());
  const detailHref = `/rooms/${room.id}/memories/${memory.id}`;

  // Only the author may edit; the data function enforces this too, the page just explains it.
  if (memory.author_id !== profile.id) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: room.name, href: `/rooms/${room.id}` }, { label: memory.title, href: detailHref }, { label: "Edit" }]} />
        <section className="panel grid max-w-lg gap-3 p-6" role="alert">
          <h1 className="title-lg">Only the author can edit this memory</h1>
          <p className="text-sm text-[var(--color-muted)]">This memory was written by the other member of the room. You can still read it.</p>
          <Link className="btn btn-secondary self-start" href={detailHref}>Back to memory</Link>
        </section>
      </div>
    );
  }

  const tags = await listTags(roomId);
  return <MemoryForm memory={memory} mode="edit" room={room} tags={tags.ok ? tags.data : []} />;
}
