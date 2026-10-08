"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { EyeIcon, LeafIcon, LockIcon, MailIcon } from "@/components/shared/icons";
import { RoomCover } from "@/components/shared/room-cover";

type AuthScreenProps = {
  mode: "sign-in" | "sign-up";
};

const COPY = {
  "sign-in": {
    title: "ยินดีต้อนรับกลับมา",
    lead: "เข้าสู่ระบบเพื่อกลับไปเก็บช่วงเวลาเล็ก ๆ ของคุณต่อ",
    submit: "เข้าสู่ระบบ",
    altText: "ยังไม่มีบัญชี?",
    altHref: "/sign-up",
    altLabel: "สร้างบัญชี",
  },
  "sign-up": {
    title: "เริ่มต้นไดอารี่ของคุณ",
    lead: "สร้างบัญชีเพื่อเปิดห้องความทรงจำส่วนตัวของคุณ",
    submit: "สร้างบัญชี",
    altText: "มีบัญชีอยู่แล้ว?",
    altHref: "/sign-in",
    altLabel: "เข้าสู่ระบบ",
  },
} as const;

export function AuthScreen({ mode }: AuthScreenProps) {
  const copy = COPY[mode];
  const [showPassword, setShowPassword] = useState(false);

  // TODO(T5): connect to Supabase Auth with the shared zod schemas.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
      <section aria-hidden="true" className="relative hidden overflow-hidden lg:block">
        <RoomCover className="absolute inset-0" theme="sunrise" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(251_250_246/0.0),rgb(33_70_58/0.35))]" />
        <div className="relative z-10 px-14 pt-16">
          <LeafIcon className="mb-2 size-10 text-[var(--color-green-deep)]" />
          <p className="font-display text-7xl leading-none text-[var(--color-green-deep)]">Dear Days</p>
          <p className="font-display mt-4 text-2xl text-[var(--color-green-deep)]/85">Little moments, kept forever.</p>
        </div>
        <div className="absolute bottom-14 right-12 z-10 grid w-64 gap-5">
          {["Different days", "Same happiness"].map((caption, index) => (
            <figure className={`bg-[#fffef9] p-3 pb-6 shadow-[var(--shadow-soft)] ${index === 0 ? "-rotate-3" : "rotate-2"}`} key={caption}>
              <RoomCover className="aspect-[4/3]" theme={index === 0 ? "rose" : "night"} />
              <figcaption className="mt-3 text-center font-display text-sm italic text-[var(--color-muted)]">{caption}</figcaption>
            </figure>
          ))}
        </div>
        <p className="absolute bottom-14 left-14 z-10 max-w-52 font-display text-2xl italic leading-snug text-[var(--color-paper)]">
          Same people,<br />brighter days.
        </p>
      </section>

      <section className="flex flex-col justify-center bg-[var(--color-cream-50)] px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-md">
          <Link className="font-display mb-10 block text-3xl text-[var(--color-green-deep)] lg:hidden" href="/">Dear Days</Link>
          <p className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            <LockIcon className="size-4" /> เป็นส่วนตัวโดยดีไซน์
          </p>
          <h1 className="font-display text-4xl text-[var(--color-green-deep)]">{copy.title}</h1>
          <p className="mt-3 leading-7 text-[var(--color-muted)]">{copy.lead}</p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <div>
                <label className="field-label" htmlFor="display-name">ชื่อที่แสดง</label>
                <input autoComplete="nickname" className="field-input" id="display-name" name="display_name" placeholder="เช่น ซี" required />
              </div>
            ) : null}
            <div>
              <label className="field-label" htmlFor="email">อีเมล</label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input autoComplete="email" className="field-input pl-11" id="email" name="email" placeholder="you@example.com" required type="email" />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="password">รหัสผ่าน</label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="field-input px-11" id="password" minLength={8} name="password" placeholder="รหัสผ่านของคุณ" required type={showPassword ? "text" : "password"} />
                <button aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" onClick={() => setShowPassword((value) => !value)} type="button">
                  <EyeIcon className="size-5" />
                </button>
              </div>
              {mode === "sign-in" ? (
                <p className="mt-2 text-right text-xs"><span className="text-[var(--color-muted)] underline underline-offset-4">ลืมรหัสผ่าน?</span></p>
              ) : (
                <p className="mt-2 text-xs text-[var(--color-muted)]">อย่างน้อย 8 ตัวอักษร</p>
              )}
            </div>
            <button className="btn btn-primary w-full" type="submit">{copy.submit} →</button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" /> หรือ <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <p className="text-center text-sm text-[var(--color-muted)]">
            {copy.altText}{" "}
            <Link className="font-semibold text-[var(--color-green-deep)] underline underline-offset-4" href={copy.altHref}>{copy.altLabel}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
