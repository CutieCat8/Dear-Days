"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-16 max-w-md rounded-2xl border border-[#e6cbb6] bg-[#fff8ef] p-8 text-center" role="alert">
      <h1 className="title-lg">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">We couldn&apos;t load your memories. Please try again.</p>
      <button className="btn btn-primary mt-5" onClick={reset} type="button">Try again</button>
    </section>
  );
}
