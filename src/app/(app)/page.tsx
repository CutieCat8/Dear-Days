import Link from "next/link";

import { MemoryCard } from "@/components/features/museum/memory-card";
import { ArrowRightIcon, CameraIcon, LeafIcon, LockIcon, PinIcon, PlusIcon, UsersIcon } from "@/components/shared/icons";
import { RoomCover, THEME_LABELS } from "@/components/shared/room-cover";
import { MOOD_LABELS } from "@/lib/contracts/constants";
import { mockMemories, mockRooms, mockTags } from "@/lib/contracts/fixtures";

// TODO(T6/T19): replace fixtures with listRooms()/listMemories() from src/lib/data.
export default function HomePage() {
  const recent = [...mockMemories].sort((a, b) => b.memory_date.localeCompare(a.memory_date)).slice(0, 3);
  const places = mockTags.filter((tag) => tag.type === "place");
  const people = mockTags.filter((tag) => tag.type === "person");
  const moodCounts = mockMemories.reduce<Record<string, number>>((acc, memory) => {
    if (memory.mood) acc[memory.mood] = (acc[memory.mood] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as keyof typeof MOOD_LABELS | undefined;

  const stats = [
    { icon: CameraIcon, value: mockMemories.length, label: "ความทรงจำทั้งหมด" },
    { icon: PinIcon, value: places.length, label: "สถานที่ที่ไปมา" },
    { icon: UsersIcon, value: people.length, label: "คนในความทรงจำ" },
  ];

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-[var(--color-green-deep)] sm:text-5xl">ความทรงจำของคุณ</h1>
            <p className="font-display mt-2 flex items-center gap-2 text-xl text-[var(--color-sage-strong)]">
              ยินดีต้อนรับกลับมา <LeafIcon className="size-5" />
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link className="btn btn-primary" href="/rooms/new"><PlusIcon className="size-4" /> สร้างห้อง</Link>
            <Link className="btn btn-secondary" href="/rooms/join"><UsersIcon className="size-4" /> เข้าร่วมห้อง</Link>
          </div>
        </header>

        <section aria-labelledby="rooms-heading" className="mt-9 scroll-mt-6" id="rooms">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-[var(--color-green-deep)]" id="rooms-heading">ห้องของคุณ</h2>
            <span className="text-sm text-[var(--color-muted)]">{mockRooms.length} ห้อง</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockRooms.map((room) => {
              const count = mockMemories.filter((memory) => memory.room_id === room.id).length;
              return (
                <Link className="panel group overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]" href={`/rooms/${room.id}`} key={room.id}>
                  <RoomCover className="aspect-[16/10]" theme={room.theme}>
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-paper)]/90 px-2.5 py-1 text-[11px] font-bold text-[var(--color-green-deep)]">
                      <LockIcon className="size-3.5" /> ส่วนตัว
                    </span>
                  </RoomCover>
                  <div className="p-4">
                    <h3 className="font-display text-xl text-[var(--color-green-deep)]">{room.name}</h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{room.life_period} · ธีม{THEME_LABELS[room.theme]}</p>
                    <p className="mt-4 flex items-center gap-4 text-xs text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1.5"><CameraIcon className="size-4" /> {count} ความทรงจำ</span>
                      <span className="inline-flex items-center gap-1.5"><UsersIcon className="size-4" /> {room.member_count}/2 คน</span>
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-sage-strong)] hover:bg-[var(--color-sage)]/40 hover:text-[var(--color-green-deep)]" href="/rooms/new">
              <PlusIcon className="size-6" /> สร้างห้องใหม่
            </Link>
          </div>
        </section>

        <section aria-labelledby="recent-heading" className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-[var(--color-green-deep)]" id="recent-heading">ความทรงจำล่าสุด</h2>
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-green)] hover:underline" href={`/rooms/${mockRooms[0].id}/gallery`}>
              ดูทั้งหมด <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {recent.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-5">
        <section aria-labelledby="week-heading" className="panel p-5">
          <h2 className="font-display text-xl text-[var(--color-green-deep)]" id="week-heading">สัปดาห์นี้</h2>
          <ul className="mt-4 grid gap-1">
            {stats.map(({ icon: Icon, value, label }) => (
              <li className="flex items-center gap-3 rounded-xl py-2" key={label}>
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-cream-200)] text-[var(--color-green)]"><Icon className="size-5" /></span>
                <span><b className="font-display text-xl text-[var(--color-green-deep)]">{value}</b> <span className="text-sm text-[var(--color-muted)]">{label}</span></span>
              </li>
            ))}
            <li className="flex items-center gap-3 border-t border-[var(--color-border)] pt-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-cream-200)] text-[var(--color-green)]"><LeafIcon className="size-5" /></span>
              <span className="text-sm text-[var(--color-muted)]">มู้ดเด่น <b className="text-[var(--color-green-deep)]">{topMood ? MOOD_LABELS[topMood] : "ยังไม่มี"}</b></span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="quick-heading" className="rounded-3xl bg-[var(--color-sage)]/70 p-5">
          <h2 className="font-display text-xl text-[var(--color-green-deep)]" id="quick-heading">เพิ่มความทรงจำด่วน</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">จดความคิด รูปถ่าย หรือทั้งสองอย่าง</p>
          <Link className="btn btn-primary mt-4 w-full" href={`/rooms/${mockRooms[0].id}/memories/new`}><PlusIcon className="size-4" /> เพิ่มความทรงจำ</Link>
        </section>

        <section aria-labelledby="places-heading" className="panel p-5">
          <h2 className="font-display text-xl text-[var(--color-green-deep)]" id="places-heading">สถานที่ล่าสุด</h2>
          <ul className="mt-3 grid gap-3">
            {places.map((place) => (
              <li className="flex items-center gap-3" key={place.id}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-sage)] text-[var(--color-green)]"><PinIcon className="size-5" /></span>
                <span className="text-sm font-semibold text-[var(--color-green-deep)]">{place.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
