"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArrowLeftIcon, UsersIcon } from "@/components/shared/icons";
import { RoomCover } from "@/components/shared/room-cover";
import { createBrowserDataSource } from "@/lib/data/browser";

const CODE_LENGTH = 8;

export function JoinRoomForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError("The invite code must be 8 characters.");
      return;
    }
    setError(null);
    setPending(true);
    // the data layer maps INVALID_INVITE_CODE and ROOM_FULL to readable messages
    const result = await createBrowserDataSource().joinRoom(code);
    if (!result.ok) {
      setError(result.error.message);
      setPending(false);
      return;
    }
    router.push(`/rooms/${result.data.id}`);
    router.refresh();
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "My rooms", href: "/" }, { label: "Join room" }]} />
      <div className="mx-auto grid max-w-4xl overflow-hidden panel md:grid-cols-[1fr_1fr]">
        <RoomCover className="hidden min-h-[22rem] md:block" theme="rose" />
        <form className="flex flex-col justify-center p-6 sm:p-9" onSubmit={handleSubmit}>
          <h1 className="title-xl">Join a private room</h1>
          <p className="mt-2.5 text-sm leading-6 text-[var(--color-muted)]">Enter the eight-character invite code to join a room and start sharing memories together.</p>

          <label className="field-label mt-7" htmlFor="invite-code">Invite code</label>
          <input
            aria-describedby={error ? "invite-error" : undefined}
            aria-invalid={error ? true : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            className="field-input font-mono text-base uppercase tracking-[0.25em]"
            id="invite-code"
            maxLength={CODE_LENGTH}
            name="invite_code"
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="AB7K2M9Q"
            value={code}
          />
          {error ? <p className="mt-2 rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" id="invite-error" role="alert">{error}</p> : null}

          <button className="btn btn-primary mt-5 w-full disabled:opacity-60" disabled={pending} type="submit">{pending ? "Joining…" : "Join room"}</button>
          <Link className="mt-3 inline-flex items-center gap-1 self-start text-xs text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" href="/">
            <ArrowLeftIcon className="size-3.5" /> Back to rooms
          </Link>
          <p className="mt-7 flex items-center gap-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted)]">
            <UsersIcon className="size-4 shrink-0" /> A room holds its owner and one invited member.
          </p>
        </form>
      </div>
    </div>
  );
}
