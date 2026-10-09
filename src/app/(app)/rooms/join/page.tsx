import { JoinRoomForm } from "@/components/features/rooms/join-room-form";

export default async function JoinRoomPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  const raw = Array.isArray(code) ? code[0] : code;
  const initialCode = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return <JoinRoomForm initialCode={initialCode} />;
}
