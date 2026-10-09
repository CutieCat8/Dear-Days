import { JoinRoomForm } from "@/components/features/rooms/join-room-form";

type JoinRoomPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

export default async function JoinRoomPage({ searchParams }: JoinRoomPageProps) {
  const { code } = await searchParams;
  const initialCode = Array.isArray(code) ? code[0] : code;

  return <JoinRoomForm initialCode={initialCode} />;
}
