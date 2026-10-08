"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="mt-3 text-red-800">ยังโหลดข้อมูลไม่ได้ กรุณาลองอีกครั้ง</p>
      <button className="mt-6 rounded-full bg-red-700 px-4 py-2 text-white" onClick={reset} type="button">ลองอีกครั้ง</button>
    </section>
  );
}
