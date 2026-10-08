export default function RoomLoading() {
  return (
    <section aria-busy="true" aria-label="Loading room" className="animate-pulse pb-10" role="status">
      <div className="mb-4 h-4 w-48 rounded-full bg-[var(--color-cream-200)]" />
      <div className="mb-6 flex items-end justify-between gap-5">
        <div className="w-full max-w-md">
          <div className="h-9 w-3/5 rounded-lg bg-[var(--color-sage)]" />
          <div className="mt-3 h-3.5 w-48 rounded-full bg-[var(--color-cream-200)]" />
        </div>
        <div className="hidden h-10 w-64 rounded-lg bg-[var(--color-sage)] md:block" />
      </div>
      <div className="min-h-[28rem] rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-cream-100),var(--color-sage))]" />
      <span className="sr-only">Arranging the room and its memories…</span>
    </section>
  );
}
