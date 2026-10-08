import Link from "next/link";

import { ActionLink } from "@/components/shared/action-link";
import { ArrowLeftIcon, GridIcon, LockIcon, PlusIcon } from "@/components/shared/icons";
import type { Memory, Room } from "@/lib/contracts/types";

import { MemoryCard } from "./memory-card";
import { MuseumScene } from "./museum-scene";

type MuseumRoomProps = {
  room: Room;
  memories: Memory[];
};

const THEME_LABELS: Record<Room["theme"], string> = {
  sunrise: "แสงเช้า",
  rose: "กุหลาบ",
  night: "ค่ำคืน",
};

export function MuseumRoom({ room, memories }: MuseumRoomProps) {
  const basePath = `/rooms/${room.id}`;

  return (
    <article className="pb-12">
      <nav aria-label="เส้นทางภายในห้อง" className="mb-5 flex items-center justify-between gap-4 text-sm text-[var(--color-muted)]">
        <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition hover:bg-[var(--color-sage)]/55 hover:text-[var(--color-green-deep)]" href="/">
          <ArrowLeftIcon />
          ห้องของฉัน
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sage)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-green-deep)]">
          <LockIcon className="size-4" /> ห้องส่วนตัว
        </span>
      </nav>

      <header className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sage-strong)]">
            ห้องธีม{THEME_LABELS[room.theme]} · สมาชิก {room.member_count}/2
          </p>
          <h1 className="font-display text-4xl leading-tight text-[var(--color-green-deep)] sm:text-5xl">{room.name}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)] sm:text-base">
            {room.life_period} · {memories.length} ความทรงจำ
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <ActionLink href={`${basePath}/memories/new`} icon={<PlusIcon />}>เพิ่มความทรงจำ</ActionLink>
          <ActionLink href={`${basePath}/gallery`} icon={<GridIcon />} variant="secondary">เปิด Gallery</ActionLink>
        </div>
      </header>

      {memories.length === 0 ? (
        <RoomEmptyState roomId={room.id} />
      ) : (
        <>
          <section aria-labelledby="museum-heading" className="hidden lg:block">
            <h2 className="sr-only" id="museum-heading">ฉากห้องพิพิธภัณฑ์ความทรงจำ</h2>
            <MuseumScene memories={memories} room={room} />
          </section>

          <section aria-labelledby="mobile-memories-heading" className="lg:hidden">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-sage-strong)]">เปิดดูได้ทุกใบ</p>
                <h2 className="font-display mt-1 text-2xl text-[var(--color-green-deep)]" id="mobile-memories-heading">ความทรงจำในห้อง</h2>
              </div>
              <span className="text-sm text-[var(--color-muted)]">{memories.length} รายการ</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {memories.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}
            </div>
          </section>
        </>
      )}
    </article>
  );
}

function RoomEmptyState({ roomId }: { roomId: string }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-16 text-center shadow-[var(--shadow-soft)] sm:px-10">
      <div aria-hidden="true" className="mx-auto mb-7 flex h-28 w-36 items-end justify-center rounded-t-full bg-[var(--color-sage)]/65 pb-3">
        <span className="h-12 w-16 rotate-[-4deg] rounded-sm border-4 border-[#b89262] bg-[var(--color-cream-100)] shadow-md" />
      </div>
      <h2 className="font-display text-3xl text-[var(--color-green-deep)]">ห้องนี้กำลังรอเรื่องแรก</h2>
      <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--color-muted)]">เริ่มด้วยวันธรรมดาหนึ่งวัน รูปไม่จำเป็น—ข้อความสั้น ๆ ก็กลายเป็นของชิ้นแรกในห้องได้</p>
      <div className="mt-7 inline-flex">
        <ActionLink href={`/rooms/${roomId}/memories/new`} icon={<PlusIcon />}>เพิ่มความทรงจำแรก</ActionLink>
      </div>
    </section>
  );
}
