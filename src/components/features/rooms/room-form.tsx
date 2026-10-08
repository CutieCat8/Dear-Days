"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { LockIcon, UsersIcon } from "@/components/shared/icons";
import { RoomCover, THEME_LABELS } from "@/components/shared/room-cover";
import type { Room } from "@/lib/contracts/types";

type RoomFormProps = {
  mode: "create" | "edit";
  room?: Room;
  cancelHref: string;
};

const THEMES = ["sunrise", "rose", "night"] as const;

export function RoomForm({ mode, room, cancelHref }: RoomFormProps) {
  const [name, setName] = useState(room?.name ?? "");
  const [period, setPeriod] = useState(room?.life_period ?? "");
  const [theme, setTheme] = useState<Room["theme"]>(room?.theme ?? "sunrise");
  const isEdit = mode === "edit";

  // TODO(T7/T9): call createRoom/updateRoom from src/lib/data.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form className="panel grid gap-6 p-6 sm:p-8" onSubmit={handleSubmit}>
        <div>
          <h1 className="font-display text-4xl text-[var(--color-green-deep)]">{isEdit ? "แก้ไขห้อง" : "สร้างห้องใหม่"}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            {isEdit ? "อัปเดตรายละเอียดห้อง แล้วดูตัวอย่างได้ทางด้านข้าง" : "พื้นที่ส่วนตัวสำหรับเก็บความทรงจำของคุณและอีกหนึ่งคนที่คุณเชิญ"}
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="room-name">ชื่อห้อง</label>
          <input className="field-input" id="room-name" maxLength={80} name="name" onChange={(event) => setName(event.target.value)} placeholder="เช่น วันธรรมดาของเรา" required value={name} />
          <p className="mt-1 text-right text-xs text-[var(--color-muted)]">{name.length}/80</p>
        </div>

        <div>
          <label className="field-label" htmlFor="life-period">ช่วงชีวิต</label>
          <input className="field-input" id="life-period" maxLength={80} name="life_period" onChange={(event) => setPeriod(event.target.value)} placeholder="เช่น มหาวิทยาลัย 2026 – 2029" required value={period} />
        </div>

        <fieldset>
          <legend className="field-label">ธีมห้อง</legend>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((value) => (
              <label className="cursor-pointer" key={value}>
                <input checked={theme === value} className="peer sr-only" name="theme" onChange={() => setTheme(value)} type="radio" value={value} />
                <RoomCover className="aspect-[4/3] rounded-xl border-2 border-transparent ring-offset-2 transition peer-checked:border-[var(--color-green)] peer-checked:ring-2 peer-checked:ring-[var(--color-green)]/30 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-[var(--color-honey)]" theme={value} />
                <span className="mt-1.5 block text-center text-xs font-semibold text-[var(--color-green-deep)]">{THEME_LABELS[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary flex-1" type="submit">{isEdit ? "บันทึกการเปลี่ยนแปลง" : "สร้างห้อง"}</button>
          <Link className="btn btn-secondary flex-1" href={cancelHref}>ยกเลิก</Link>
        </div>
        {isEdit ? null : (
          <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]"><UsersIcon className="size-4" /> เชิญได้อีก 1 คนหลังสร้างห้อง</p>
        )}
      </form>

      <section aria-label="ตัวอย่างห้อง" className="panel overflow-hidden lg:sticky lg:top-8">
        <div className="p-5 pb-3">
          <h2 className="font-display text-xl text-[var(--color-green-deep)]">ตัวอย่างห้อง</h2>
          <p className="text-sm text-[var(--color-muted)]">หน้าตาของห้องจะเป็นแบบนี้</p>
        </div>
        <div className="px-5 pb-5">
          <RoomCover className="flex aspect-[16/11] items-end rounded-2xl p-6" theme={theme}>
            <div className="text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.35)]">
              <p className="font-display text-3xl sm:text-4xl">{name || "ชื่อห้องของคุณ"}</p>
              <p className="mt-1 text-sm">{period || "ช่วงชีวิต"}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs"><LockIcon className="size-4" /> ห้องส่วนตัว · เฉพาะคุณและอีกหนึ่งคน</p>
            </div>
          </RoomCover>
          <div className="mt-6 flex flex-col items-center py-6 text-center text-sm text-[var(--color-muted)]">
            <span aria-hidden="true" className="mb-3 h-12 w-16 -rotate-3 rounded-sm border-4 border-[#b89262] bg-[var(--color-cream-100)] shadow-md" />
            ยังไม่มีความทรงจำ — เริ่มเก็บวันดี ๆ ด้วยกัน
          </div>
        </div>
      </section>
    </div>
  );
}
