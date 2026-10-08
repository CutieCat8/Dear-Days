"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ArrowLeftIcon, UsersIcon } from "@/components/shared/icons";
import { RoomCover } from "@/components/shared/room-cover";

const CODE_LENGTH = 8;

export function JoinRoomForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // TODO(T8/T9): call joinRoom(code) and map ROOM_FULL / INVALID_INVITE_CODE to the message below.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) setError("รหัสเชิญต้องมี 8 ตัวอักษร");
    else setError(null);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.05fr_1fr]">
      <RoomCover className="hidden min-h-[24rem] rounded-3xl md:block" theme="rose" />
      <form className="panel flex flex-col justify-center p-6 sm:p-10" onSubmit={handleSubmit}>
        <h1 className="font-display text-4xl text-[var(--color-green-deep)]">เข้าร่วมห้องส่วนตัว</h1>
        <p className="mt-3 leading-7 text-[var(--color-muted)]">ใส่รหัสเชิญ 8 ตัวอักษร เพื่อเริ่มแบ่งปันความทรงจำร่วมกัน</p>

        <label className="field-label mt-8" htmlFor="invite-code">รหัสเชิญ</label>
        <input
          aria-describedby={error ? "invite-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoCapitalize="characters"
          autoComplete="off"
          className="field-input font-mono text-lg uppercase tracking-[0.3em]"
          id="invite-code"
          maxLength={CODE_LENGTH}
          name="invite_code"
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="AB7K2M9Q"
          value={code}
        />
        {error ? <p className="mt-2 rounded-xl bg-[#f8e3e3] px-3 py-2 text-sm text-[#8a3a3a]" id="invite-error" role="alert">{error}</p> : null}

        <button className="btn btn-primary mt-6 w-full" type="submit">เข้าร่วมห้อง</button>
        <Link className="mt-4 inline-flex items-center gap-1.5 self-start text-sm text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" href="/">
          <ArrowLeftIcon className="size-4" /> กลับหน้าหลัก
        </Link>
        <p className="mt-8 flex items-center gap-2 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-muted)]">
          <UsersIcon className="size-5" /> หนึ่งห้องมีเจ้าของและสมาชิกที่ได้รับเชิญเพียง 1 คน
        </p>
      </form>
    </div>
  );
}
