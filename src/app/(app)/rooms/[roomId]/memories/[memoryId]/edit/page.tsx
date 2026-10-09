import { notFound } from "next/navigation";

import { MemoryForm } from "@/components/features/memory/memory-form";
import { getDataSource, getViewer } from "@/lib/data/server";
import { unwrap } from "@/lib/data/unwrap";

type EditMemoryPageProps = {
  params: Promise<{ roomId: string; memoryId: string }>;
};

export default async function EditMemoryPage({ params }: EditMemoryPageProps) {
  const { roomId, memoryId } = await params;
  const source = await getDataSource();
  const [room, memory, viewer, tags] = await Promise.all([
    source.getRoom(roomId).then(unwrap),
    source.getMemory(roomId, memoryId).then(unwrap),
    getViewer(),
    source.listTags(roomId).then(unwrap),
  ]);
  // only the author edits a memory (the database enforces this as well)
  if (!viewer || memory.author_id !== viewer.id) notFound();

  return <MemoryForm memory={memory} mode="edit" room={room} tags={tags} />;
}
