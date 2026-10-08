export default function RoomLoading() {
  return (
    <section aria-busy="true" aria-label="กำลังโหลดห้อง" className="animate-pulse pb-12" role="status">
      <div className="mb-5 h-11 w-32 rounded-xl bg-[var(--color-sage)]" />
      <div className="mb-7 flex items-end justify-between gap-5">
        <div className="w-full max-w-md">
          <div className="mb-3 h-3 w-44 rounded-full bg-[var(--color-cream-200)]" />
          <div className="h-12 w-4/5 rounded-xl bg-[var(--color-sage)]" />
          <div className="mt-3 h-4 w-56 rounded-full bg-[var(--color-cream-200)]" />
        </div>
        <div className="hidden h-11 w-72 rounded-xl bg-[var(--color-sage)] md:block" />
      </div>
      <div className="min-h-[32rem] rounded-[2rem] border border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-cream-100),var(--color-sage))] shadow-[var(--shadow-soft)]" />
      <span className="sr-only">กำลังจัดห้องและความทรงจำ…</span>
    </section>
  );
}
