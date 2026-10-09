import Link from "next/link";

export default function AppNotFound() {
  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="title-xl mt-2">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">It may have moved, or you may no longer have access.</p>
      <Link className="btn btn-primary mt-6" href="/rooms">Back to My rooms</Link>
    </section>
  );
}