import { notFound } from "next/navigation";

import { MemoryForm } from "@/components/features/memory/memory-form";
import { mockRooms } from "@/lib/contracts/fixtures";

type NewMemoryPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function NewMemoryPage({ params }: NewMemoryPageProps) {
  const { roomId } = await params;
  const room = mockRooms.find((item) => item.id === roomId);

  if (!room) notFound();

  return <MemoryForm mode="create" room={room} />;
}
