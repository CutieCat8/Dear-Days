"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { CameraIcon } from "@/components/shared/icons";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { DEFAULT_ROOM_COVER_IMAGE } from "@/components/shared/room-cover";
import { dataMode } from "@/lib/data/config";
import { saveProfileMedia, validateProfileMediaFile, type ProfileMediaKind } from "@/lib/data/profile-media";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileMediaHeaderProps = {
  avatarPath: string | null;
  avatarUrl: string | null;
  bio: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  email: string | null;
  name: string;
  roomCount?: number;
  memoryCount?: number;
};

type Notice = { kind: "ok" | "error"; text: string } | null;

export function ProfileMediaHeader(props: ProfileMediaHeaderProps) {
  const router = useRouter();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const demo = dataMode() === "mock";
  const [avatar, setAvatar] = useState({ path: props.avatarPath, url: props.avatarUrl });
  const [cover, setCover] = useState({ path: props.coverPath, url: props.coverUrl });
  const [pending, setPending] = useState<ProfileMediaKind | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function change(kind: ProfileMediaKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateProfileMediaFile(file);
    if (validationError) {
      setNotice({ kind: "error", text: validationError });
      return;
    }

    const current = kind === "avatar" ? avatar : cover;
    const preview = URL.createObjectURL(file);
    if (kind === "avatar") setAvatar({ ...current, url: preview });
    else setCover({ ...current, url: preview });
    setNotice(null);
    setPending(kind);

    const result = await saveProfileMedia(createSupabaseBrowserClient(), kind, file, current.path);
    setPending(null);
    if (!result.ok) {
      URL.revokeObjectURL(preview);
      if (kind === "avatar") setAvatar(current);
      else setCover(current);
      setNotice({ kind: "error", text: result.error.message });
      return;
    }

    const next = { path: result.data.path, url: result.data.signed_url ?? preview };
    if (result.data.signed_url) URL.revokeObjectURL(preview);
    if (kind === "avatar") setAvatar(next);
    else setCover(next);
    setNotice({ kind: "ok", text: `${kind === "avatar" ? "Profile photo" : "Cover photo"} updated.` });
    router.refresh();
  }

  function handleCoverError() {
    setCover((current) => ({ ...current, url: null }));
    if (!cover.path) return;
    const key = `dear-days:profile-media-refresh:${cover.path}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    router.refresh();
  }

  const disabled = demo || pending !== null;

  return (
    <header>
      <div className="relative h-36 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-sage)] sm:h-48 lg:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element -- supports both a local default and private signed URL */}
        <img alt="" className="size-full object-cover" onError={cover.url ? handleCoverError : undefined} src={cover.url ?? DEFAULT_ROOM_COVER_IMAGE} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5" />
        <p aria-hidden="true" className="font-display absolute right-8 top-8 hidden -rotate-6 text-2xl italic leading-tight text-white/95 drop-shadow sm:block">Good days<br />&nbsp;&nbsp;live here</p>
        <button className="btn btn-secondary btn-sm absolute bottom-4 right-4 z-10 bg-[var(--color-paper)]/95 shadow-sm disabled:opacity-60" disabled={disabled} onClick={() => coverInput.current?.click()} type="button">
          <CameraIcon className="size-4" /> {pending === "cover" ? "Uploading…" : "Change cover"}
        </button>
        <input accept="image/jpeg,image/png,image/webp" aria-label="Choose a new cover photo" className="sr-only" disabled={disabled} onChange={(event) => void change("cover", event)} ref={coverInput} tabIndex={-1} type="file" />
      </div>

      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:gap-5 sm:px-8">
        <div className="relative z-10 -mt-12 w-fit shrink-0 self-start sm:-mt-16">
          <ProfileAvatar className="size-24 border-4 border-[var(--color-paper)] text-4xl shadow-[var(--shadow-soft)] sm:size-32" name={props.name} src={avatar.url} />
          <button aria-label="Change profile photo" className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-paper)] text-[var(--color-green-deep)] shadow-md transition-colors hover:bg-[var(--color-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-green)] disabled:opacity-60 sm:bottom-2 sm:size-10" disabled={disabled} onClick={() => avatarInput.current?.click()} type="button">
            <CameraIcon className="size-4" />
          </button>
          <input accept="image/jpeg,image/png,image/webp" aria-label="Choose a new profile photo" className="sr-only" disabled={disabled} onChange={(event) => void change("avatar", event)} ref={avatarInput} tabIndex={-1} type="file" />
        </div>

        <div className="min-w-0 pb-1">
          <h1 className="title-xl">{props.name}</h1>
          {props.email ? <p className="truncate text-sm text-[var(--color-muted)]">{props.email}</p> : null}
          <p className="mt-1 max-w-md text-sm leading-6 text-[var(--color-muted)]">{props.bio || "Collecting ordinary, lovely days — one photo at a time."}</p>
        </div>
        {props.memoryCount !== undefined && props.roomCount !== undefined ? (
          <dl className="flex gap-6 pb-1 sm:ml-auto">
            {[{ label: "memories", value: props.memoryCount }, { label: "rooms", value: props.roomCount }].map(({ label, value }) => (
              <div className="flex flex-col-reverse items-center" key={label}>
                <dt className="text-[0.7rem] text-[var(--color-muted)]">{label}</dt>
                <dd className="font-display text-base leading-tight text-[var(--color-green-deep)]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {notice ? <p className={`mx-2 mt-3 rounded-lg px-3 py-2 text-xs sm:mx-8 ${notice.kind === "ok" ? "bg-[var(--color-sage)] text-[var(--color-green-deep)]" : "bg-[#f8e3e3] text-[#8a3a3a]"}`} role={notice.kind === "ok" ? "status" : "alert"}>{notice.text}</p> : null}
      {demo ? <p className="mx-2 mt-2 text-xs text-[var(--color-muted)] sm:mx-8">Demo mode: profile photos are preview-only and cannot be uploaded.</p> : null}
    </header>
  );
}
