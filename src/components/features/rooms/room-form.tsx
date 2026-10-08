"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
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
    <div>
      <Breadcrumbs items={isEdit && room ? [{ label: "My rooms", href: "/" }, { label: room.name, href: cancelHref }, { label: "Edit room" }] : [{ label: "My rooms", href: "/" }, { label: "Create room" }]} />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <form className="panel grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
          <div>
            <h1 className="title-xl">{isEdit ? "Edit room" : "Create a new room"}</h1>
            <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted)]">
              {isEdit ? "Update your room details and see a live preview on the right." : "A private space to keep your memories, just for you and one invited person."}
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="room-name">Room name</label>
            <input className="field-input" id="room-name" maxLength={80} name="name" onChange={(event) => setName(event.target.value)} placeholder="e.g. University Days" required value={name} />
            <p className="mt-1 text-right text-[0.7rem] text-[var(--color-muted)]">{name.length}/80</p>
          </div>

          <div>
            <label className="field-label" htmlFor="life-period">Life period</label>
            <input className="field-input" id="life-period" maxLength={80} name="life_period" onChange={(event) => setPeriod(event.target.value)} placeholder="e.g. University 2026 – 2029" required value={period} />
          </div>

          <fieldset>
            <legend className="field-label">Room theme</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {THEMES.map((value) => (
                <label className="cursor-pointer" key={value}>
                  <input checked={theme === value} className="peer sr-only" name="theme" onChange={() => setTheme(value)} type="radio" value={value} />
                  <RoomCover className="aspect-[4/3] rounded-lg border-2 border-transparent ring-offset-2 transition peer-checked:border-[var(--color-green)] peer-checked:ring-2 peer-checked:ring-[var(--color-green)]/25 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-green)]" theme={value} />
                  <span className="mt-1 block text-center text-[0.72rem] font-medium text-[var(--color-green-deep)]">{THEME_LABELS[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button className="btn btn-primary flex-1" type="submit">{isEdit ? "Save changes" : "Create room"}</button>
            <Link className="btn btn-secondary flex-1" href={cancelHref}>Cancel</Link>
          </div>
          {isEdit ? null : (
            <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]"><UsersIcon className="size-4" /> You can invite one person after creating the room.</p>
          )}
        </form>

        <section aria-label="Room preview" className="panel overflow-hidden lg:sticky lg:top-6">
          <div className="p-4 pb-2.5">
            <h2 className="title-md">Live preview</h2>
            <p className="text-xs text-[var(--color-muted)]">This is how your room will look.</p>
          </div>
          <div className="px-4 pb-4">
            <RoomCover className="flex aspect-[16/10] items-end rounded-xl p-5" theme={theme}>
              <div className="text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.35)]">
                <p className="font-display text-2xl sm:text-3xl">{name || "Your room name"}</p>
                <p className="mt-0.5 text-xs">{period || "Life period"}</p>
                <p className="mt-2.5 inline-flex items-center gap-1.5 text-[0.7rem]"><LockIcon className="size-3.5" /> Private room · just for you and one invited person</p>
              </div>
            </RoomCover>
            <div className="mt-4 flex flex-col items-center py-5 text-center text-xs text-[var(--color-muted)]">
              <span aria-hidden="true" className="mb-2.5 h-9 w-12 -rotate-3 rounded-sm border-[3px] border-[#b89262] bg-[var(--color-cream-100)] shadow-md" />
              No memories yet — start collecting good days together.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
