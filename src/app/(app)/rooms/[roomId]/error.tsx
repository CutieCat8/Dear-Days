"use client";

export default function RoomError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-[#e6cbb6] bg-[#fff8ef] p-8 text-center" role="alert">
      <div aria-hidden="true" className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#f3ddcb] text-lg text-[#8b503c]">!</div>
      <h1 className="title-lg">We can&apos;t open this room yet</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">The room may not exist, you may not be a member, or the data didn&apos;t load.</p>
      <button className="btn btn-primary mt-5" onClick={reset} type="button">Try again</button>
    </section>
  );
}
