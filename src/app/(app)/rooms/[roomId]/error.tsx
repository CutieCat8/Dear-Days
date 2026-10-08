"use client";

export default function RoomError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#e6cbb6] bg-[#fff8ef] p-8 text-center shadow-[var(--shadow-card)] sm:p-12" role="alert">
      <div aria-hidden="true" className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#f3ddcb] text-2xl text-[#8b503c]">!</div>
      <h1 className="font-display text-3xl text-[var(--color-green-deep)]">ยังเปิดห้องนี้ไม่ได้</h1>
      <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--color-muted)]">ห้องอาจไม่มีอยู่ คุณอาจไม่ได้เป็นสมาชิก หรือระบบยังโหลดข้อมูลไม่สำเร็จ</p>
      <button className="mt-6 min-h-11 rounded-xl bg-[var(--color-green)] px-5 py-2.5 font-semibold text-white transition hover:bg-[var(--color-green-deep)]" onClick={reset} type="button">ลองอีกครั้ง</button>
    </section>
  );
}
