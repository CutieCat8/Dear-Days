"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-12 max-w-lg py-8 text-center" role="alert">
      <p className="eyebrow">Unable to load this page</p>
      <h1 className="title-lg mt-2">Your rooms are still safe</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">There was a problem loading this part of Dear Days. Try again, or return to your rooms.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn btn-primary" onClick={reset} type="button">Try again</button>
        <Link className="btn btn-secondary" href="/rooms">My rooms</Link>
      </div>
    </section>
  );
}