"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlusIcon, StarIcon } from "@/components/shared/icons";
import { THEME_LABELS } from "@/components/shared/room-cover";
import type { Room } from "@/lib/contracts/types";

type RoomFormProps = {
  mode: "create" | "edit";
  room?: Room;
  cancelHref: string;
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

function Avatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span aria-hidden="true" className="font-display flex size-12 shrink-0 items-center justify-center rounded-full text-lg text-white" style={{ background: tone }}>
      {name.charAt(0)}
    </span>
  );
}

export function RoomForm({ mode, room, cancelHref }: RoomFormProps) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(room?.name ?? "");
  const [period, setPeriod] = useState(room?.life_period ?? "");
  // UI only: the data contract has no description field yet (add it to docs/CONTRACTS.md + schemas before saving it).
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<Theme>(room?.theme ?? "sunrise");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (shareButtonRef.current) shareButtonRef.current.hidden = typeof navigator.share !== "function";
  }, []);

  // TODO(T7/T9): call createRoom/updateRoom from src/lib/data.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const memberCount = room?.member_count ?? 1;
  const hasSecondMember = isEdit && memberCount >= 2;

  async function copyInvite(value: "code" | "link") {
    if (!room) return;

    const inviteLink = new URL("/rooms/join", window.location.origin);
    inviteLink.searchParams.set("code", room.invite_code);
    const text = value === "code" ? room.invite_code : inviteLink.toString();

    try {
      await navigator.clipboard.writeText(text);
      setInviteFeedback(value === "code" ? "Invite code copied." : "Invite link copied.");
    } catch {
      setInviteFeedback("Copy is unavailable in this browser.");
    }
  }

  async function shareInvite() {
    if (!room || !navigator.share) return;

    const inviteLink = new URL("/rooms/join", window.location.origin);
    inviteLink.searchParams.set("code", room.invite_code);

    try {
      await navigator.share({
        title: "Join my Dear Days room",
        text: `Use invite code ${room.invite_code} to join my room.`,
        url: inviteLink.toString(),
      });
      setInviteFeedback("Invite shared.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setInviteFeedback("Sharing is unavailable right now.");
    }
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
          </div>

          <div>
            <label className="field-label" htmlFor="life-period">Life period</label>
            <input className="field-input" id="life-period" maxLength={80} name="life_period" onChange={(event) => setPeriod(event.target.value)} placeholder="e.g. Aug 2022 – May 2026" required value={period} />
            <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]">e.g. University, First Job, Travel Year</p>
          </div>

          <div>
            <label className="field-label" htmlFor="room-description">Description</label>
            <textarea className="field-input" id="room-description" maxLength={DESCRIPTION_MAX} name="description" onChange={(event) => setDescription(event.target.value)} placeholder="A few words about this chapter of your life" rows={4} value={description} />
            <p className="mt-1 text-right text-[0.7rem] text-[var(--color-muted)]">{description.length} / {DESCRIPTION_MAX}</p>
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

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button className="btn btn-primary sm:min-w-44" type="submit">{isEdit ? "Save changes" : "Create room"}</button>
            <Link className="btn btn-secondary sm:min-w-32" href={cancelHref}>Cancel</Link>
          </div>
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
              Members <span className="text-sm text-[var(--color-muted)]">({hasSecondMember ? 2 : 1} of 2 people)</span>
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Avatar name="Sea" tone="#2f5a4a" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Sea</p>
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-[#a07a1c]"><StarIcon className="size-3" /> Owner</p>
                </div>
              </div>
              {hasSecondMember ? (
                <div className="flex items-center gap-3">
                  <Avatar name="Mint" tone="#8a7f9c" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Mint</p>
                    <p className="text-xs text-[var(--color-muted)]">Member</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)]">
                    <PlusIcon className="size-5" />
                  </span>
                  <div>
                    {/* TODO(T7/T9): invite flow. For now the invite code is shown once the room exists. */}
                    <button
                      aria-expanded={inviteOpen}
                      className="text-sm font-semibold text-[var(--color-green)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!isEdit || !room || hasSecondMember}
                      onClick={() => setInviteOpen((open) => !open)}
                      title={hasSecondMember ? "This room is full" : undefined}
                      type="button"
                    >
                      Add friend
                    </button>
                    <p className="text-xs text-[var(--color-muted)]">{isEdit && room ? `Invite code ${room.invite_code}` : "Invite one person after creating the room"}</p>
                  </div>
                </div>
              )}
            </div>
            {inviteOpen && isEdit && room && !hasSecondMember ? (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <p className="eyebrow">Room invite</p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-[0.12em] text-[var(--color-green-deep)]">{room.invite_code}</p>
                <p className="mt-1 break-all text-xs text-[var(--color-muted)]">/rooms/join?code={room.invite_code}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => void copyInvite("code")} type="button">Copy code</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => void copyInvite("link")} type="button">Copy link</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => void shareInvite()} ref={shareButtonRef} type="button">Share</button>
                </div>
                <p aria-live="polite" className="mt-2 min-h-4 text-xs text-[var(--color-muted)]">{inviteFeedback}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
