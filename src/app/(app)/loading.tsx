export default function AppLoading() {
  return (
    <section aria-busy="true" aria-label="Loading page" className="animate-pulse py-8" role="status">
      <span className="sr-only">Loading page…</span>
      <div className="mb-5 h-4 w-40 rounded-full bg-[var(--color-cream-200)]" />
      <div className="mb-3 h-8 w-64 max-w-full rounded-lg bg-[var(--color-sage)]" />
      <div className="mb-7 h-4 w-80 max-w-full rounded-full bg-[var(--color-cream-200)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div aria-hidden="true" className="aspect-[16/10] rounded-lg bg-[var(--color-sage)]/60" key={item} />)}
      </div>
    </section>
  );
}