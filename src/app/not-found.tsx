import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="title-xl mt-2">Page not found</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">The link may be wrong, or you may not have access to this memory.</p>
      <Link className="btn btn-primary mt-6" href="/">Back to home</Link>
    </section>
  );
}
