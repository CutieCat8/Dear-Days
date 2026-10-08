import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-3xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-3 text-[var(--muted)]">ลิงก์อาจไม่ถูกต้อง หรือคุณอาจไม่มีสิทธิ์เข้าถึงข้อมูลนี้</p>
      <Link className="mt-6 inline-block underline underline-offset-4" href="/">กลับหน้าหลัก</Link>
    </section>
  );
}
