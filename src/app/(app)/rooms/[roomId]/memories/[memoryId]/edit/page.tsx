import { notFound } from "next/navigation";

import { MemoryForm } from "@/components/features/memory/memory-form";
import { mockMemories, mockRooms } from "@/lib/contracts/fixtures";

type EditMemoryPageProps = {
  params: Promise<{ roomId: string; memoryId: string }>;
};

export default async function EditMemoryPage({ params }: EditMemoryPageProps) {
  const { roomId, memoryId } = await params;
  const room = mockRooms.find((item) => item.id === roomId);
  const memory = mockMemories.find((item) => item.id === memoryId && item.room_id === roomId);

  if (!room || !memory) notFound();

  return <MemoryForm memory={memory} mode="edit" room={room} />;
}
