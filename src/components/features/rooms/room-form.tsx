"use client";

import { InvitePanel } from "@/components/features/rooms/invite-panel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlusIcon, StarIcon } from "@/components/shared/icons";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { THEME_LABELS } from "@/components/shared/room-cover";
import type { Room } from "@/lib/contracts/types";
import { createBrowserDataSource } from "@/lib/data/browser";
import type { RoomMemberView } from "@/lib/contracts/types";

type RoomFormProps = {
  mode: "create" | "edit";
  room?: Room;
  cancelHref: string;
  /** People in the room (names from their profiles). */
  members?: Pick<RoomMemberView, "user_id" | "display_name" | "avatar_url" | "role">[];
};

type Theme = Room["theme"];

const THEMES = ["sunrise", "rose", "night"] as const;
const DESCRIPTION_MAX = 300;

/**
 * The real 3D room as a picture, one variant per theme (public/room-preview*.jpg, recoloured from the same render:
 * walls, backdrop and light per theme; frames, plants and floor stay true). The tile has a hairline ring and rounded
 * corners so its backdrop always reads as a picture sitting on the panel, never as part of the panel.
 */
const THEME_PICTURE: Record<Theme, { src: string; backdrop: string }> = {
  sunrise: { src: "/room-preview.jpg", backdrop: "#f8eee0" },
  rose: { src: "/room-preview-rose.jpg", backdrop: "#f3dfe5" },
  night: { src: "/room-preview-night.jpg", backdrop: "#112039" },
};

function RoomPicture({ theme, className = "" }: { theme: Theme; className?: string }) {
  const { src, backdrop } = THEME_PICTURE[theme];
  return (
    <span className={`relative block overflow-hidden rounded-xl ring-1 ring-inset ring-black/10 ${className}`} style={{ background: backdrop }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static preview picture of the 3D room */}
      <img alt="" className="size-full object-contain" src={src} />
    </span>
  );
}

export function RoomForm({ mode, room, cancelHref, members = [] }: RoomFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = mode === "edit";
  const [name, setName] = useState(room?.name ?? "");
  const [period, setPeriod] = useState(room?.life_period ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(room?.theme ?? "sunrise");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);
    const source = createBrowserDataSource();
    const input = { name, life_period: period, description: description.trim() ? description.trim() : null, theme };
    const result = isEdit && room ? await source.updateRoom(room.id, input) : await source.createRoom(input);
    if (!result.ok) {
      // the form keeps everything the user typed, including the chosen theme
      setError(result.error.message);
      setFieldErrors(result.error.field_errors ?? {});
      setPending(false);
      return;
    }
    router.push(`/rooms/${result.data.id}`);
    router.refresh();
  }

  async function handleRemoveMember(userId: string) {
    if (!room) return;
    setPending(true);
    setError(null);
    const result = await createBrowserDataSource().removeRoomMember(room.id, userId);
    setPending(false);
    setRemoveCandidate(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!room) return;
    setPending(true);
    setError(null);
    const result = await createBrowserDataSource().deleteRoom(room.id);
    if (!result.ok) {
      setError(result.error.message);
      setPending(false);
      return;
    }
    router.push("/rooms");
    router.refresh();
  }

  return (
    <div>
      <Breadcrumbs items={isEdit && room ? [{ label: "My rooms", href: "/" }, { label: room.name, href: cancelHref }, { label: "Edit room" }] : [{ label: "My rooms", href: "/" }, { label: "Create room" }]} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="title-xl">{isEdit ? "Edit room" : "Create a new room"}</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbecb9] px-3 py-1 text-xs font-semibold text-[#6f5210]">
          <StarIcon className="size-3.5" /> Owner only
        </span>
      </div>
      <p className="-mt-3 mb-5 text-sm text-[var(--color-muted)]">
        {isEdit ? "Update your room details and see a live preview on the right." : "A private space to keep your memories, just for you and one invited person."}
      </p>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.05fr]">
        <form className="panel grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
          <h2 className="font-display text-xl text-[var(--color-green-deep)]">Room settings</h2>

          <div>
            <label className="field-label" htmlFor="room-name">Room name</label>
            <input className="field-input" id="room-name" maxLength={80} name="name" onChange={(event) => setName(event.target.value)} placeholder="e.g. University Days" required value={name} />
            {fieldErrors.name ? <p className="mt-1 text-xs text-[#8a3a3a]">{fieldErrors.name[0]}</p> : null}
          </div>

          <div>
            <label className="field-label" htmlFor="life-period">Life period</label>
            <input className="field-input" id="life-period" maxLength={80} name="life_period" onChange={(event) => setPeriod(event.target.value)} placeholder="e.g. Aug 2022 – May 2026" required value={period} />
            <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]">e.g. University, First Job, Travel Year</p>
          </div>

          <div>
            <label className="field-label" htmlFor="room-description">Description</label>
            <textarea className="field-input" id="room-description" maxLength={DESCRIPTION_MAX} name="description" onChange={(event) => setDescription(event.target.value)} placeholder="A few words about this chapter of your life" rows={4} value={description} />
            <p className="mt-1 flex justify-between text-[0.7rem] text-[var(--color-muted)]"><span>Optional, shown on the room.</span><span>{description.length} / {DESCRIPTION_MAX}</span></p>
          </div>

          <fieldset>
            <legend className="field-label">Room theme</legend>
            <p className="-mt-1 mb-2.5 text-[0.72rem] text-[var(--color-muted)]">Choose a theme for your room. You can change it anytime.</p>
            <div className="grid grid-cols-3 gap-2.5">
              {THEMES.map((value) => (
                <label className="cursor-pointer" key={value}>
                  <input checked={theme === value} className="peer sr-only" name="theme" onChange={() => setTheme(value)} type="radio" value={value} />
                  <span className="block overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] p-1.5 transition peer-checked:border-[var(--color-green)] peer-checked:ring-2 peer-checked:ring-[var(--color-green)]/25 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-green)] hover:border-[var(--color-border-strong)]">
                    <RoomPicture className="aspect-[4/3] !rounded-lg" theme={value} />
                    <span className="flex items-center gap-2 px-2.5 py-2 text-[0.78rem] font-medium text-[var(--color-green-deep)]">
                      <span aria-hidden="true" className={`flex size-3.5 items-center justify-center rounded-full border ${theme === value ? "border-[var(--color-green)]" : "border-[var(--color-border-strong)]"}`}>
                        {theme === value ? <span className="size-2 rounded-full bg-[var(--color-green)]" /> : null}
                      </span>
                      {THEME_LABELS[value]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <p className="rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{error}</p> : null}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button className="btn btn-primary disabled:opacity-60 sm:min-w-44" disabled={pending} type="submit">{pending ? "Saving…" : isEdit ? "Save changes" : "Create room"}</button>
            <Link className="btn btn-secondary sm:min-w-32" href={cancelHref}>Cancel</Link>
          </div>
          {isEdit ? (
            <div className="border-t border-[var(--color-border)] pt-4">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="text-[#8a3a3a]">Delete this room, all its memories and photos for good?</span>
                  <button className="btn btn-sm bg-[#8a3a3a] text-white disabled:opacity-60" disabled={pending} onClick={handleDelete} type="button">Delete room</button>
                  <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setConfirmDelete(false)} type="button">Keep it</button>
                </div>
              ) : (
                <button className="text-xs font-medium text-[#8a3a3a] hover:underline" onClick={() => setConfirmDelete(true)} type="button">Delete this room…</button>
              )}
            </div>
          ) : null}
        </form>

        <div className="grid gap-4 lg:sticky lg:top-6">
          <section aria-label="Room preview" className="panel overflow-hidden">
            <div className="p-5 pb-0">
              <p className="eyebrow">Live preview</p>
              <h2 className="mt-1 font-display text-3xl leading-tight">{name || "Your room name"}</h2>
              <p className="mt-1 text-sm opacity-75">{period || "Life period"}</p>
              {description ? <p className="mt-2 max-w-md text-xs leading-5 opacity-75">{description}</p> : null}
            </div>
            <div className="p-5">
              <RoomPicture className="aspect-[655/472] w-full" theme={theme} />
            </div>
          </section>

          <section aria-labelledby="members-heading" className="panel p-5">
            <h2 className="font-display text-lg text-[var(--color-green-deep)]" id="members-heading">
              Members <span className="text-sm text-[var(--color-muted)]">({Math.max(members.length, 1)} of 2 people)</span>
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {members.map((member) => (
                <div className="flex items-center gap-3" key={member.user_id}>
                  <ProfileAvatar className={`size-12 text-lg ${member.role === "owner" ? "bg-[var(--color-green)]" : "bg-[#8a7f9c]"}`} name={member.display_name} src={member.avatar_url} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{member.display_name}</p>
                    {member.role === "owner" ? (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-[#a07a1c]"><StarIcon className="size-3" /> Owner</p>
                    ) : (
                      <p className="text-xs text-[var(--color-muted)]">Member</p>
                    )}
                    {isEdit && member.role === "member" ? (
                      removeCandidate === member.user_id ? (
                        <span className="mt-1 flex gap-1.5" role="group" aria-label="Confirm remove member">
                          <button className="btn btn-secondary btn-sm !text-[#8a3a3a]" disabled={pending} onClick={() => handleRemoveMember(member.user_id)} type="button">Remove</button>
                          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setRemoveCandidate(null)} type="button">Keep</button>
                        </span>
                      ) : (
                        <button className="mt-1 text-xs text-[#8a3a3a] underline-offset-2 hover:underline" onClick={() => setRemoveCandidate(member.user_id)} type="button">Remove member</button>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
              {members.length < 2 ? (
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)]">
                    <PlusIcon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-green)]">Add friend</p>
                    {isEdit && room ? <InvitePanel inviteCode={room.invite_code} roomName={room.name} /> : <p className="text-xs text-[var(--color-muted)]">After creating the room you get an invite code and link to share with one person.</p>}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
