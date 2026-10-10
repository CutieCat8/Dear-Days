"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ArrowRightIcon, EyeIcon, LeafIcon, LockIcon, MailIcon } from "@/components/shared/icons";
import { RoomCover } from "@/components/shared/room-cover";
import { dataMode } from "@/lib/data/config";
import { useHydrated } from "@/lib/use-hydrated";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthScreenProps = {
  mode: "sign-in" | "sign-up";
  /** Same-site path to return to after signing in (set by the proxy redirect, e.g. an invite link). */
  next?: string;
};

const COPY = {
  "sign-in": {
    title: "Welcome back",
    lead: "Sign in to your Dear Days diary and continue keeping your little moments, forever.",
    submit: "Sign in",
    altText: "Don't have an account?",
    altHref: "/sign-up",
    altLabel: "Create account",
  },
  "sign-up": {
    title: "Start your diary",
    lead: "Create an account to open your private room of memories.",
    submit: "Create account",
    altText: "Already have an account?",
    altHref: "/sign-in",
    altLabel: "Sign in",
  },
} as const;

const POLAROIDS = [
  { caption: "Different days, same happiness", theme: "rose", className: "-rotate-3" },
  { caption: "Little moments, kept forever", theme: "night", className: "rotate-2" },
] as const;

export function AuthScreen({ mode, next = "/" }: AuthScreenProps) {
  const copy = COPY[mode];
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  /** Where to go after signing in: the page the proxy redirected from, same-site paths only. */
  function nextPath() {
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (dataMode() === "mock") {
      router.push("/"); // demo mode has no accounts
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("display_name") ?? "").trim();
    if (mode === "sign-up" && (displayName.length < 1 || displayName.length > 50)) {
      setError("Please enter a display name (1–50 characters).");
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // one message for wrong e-mail and wrong password: never reveal which accounts exist
          setError(signInError.message === "Email not confirmed" ? "Please confirm your e-mail first. Check your inbox for the link." : signInError.status === 429 ? "Too many attempts. Please wait a moment and try again." : "The e-mail or password is not correct.");
          return;
        }
        router.replace(nextPath());
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (signUpError) {
          setError(signUpError.status === 429 ? "Too many attempts. Please wait a moment and try again." : signUpError.message);
          return;
        }
        if (data.session) {
          router.replace(nextPath());
          router.refresh();
        } else {
          // the project requires e-mail confirmation: no session until the link is opened
          setNotice("Almost there! We sent a confirmation link to your e-mail. Open it, then sign in.");
        }
      }
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section aria-hidden="true" className="relative hidden overflow-hidden lg:block">
        <RoomCover className="absolute inset-0" theme="sunrise" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(250_248_242/0.1),rgb(31_65_54/0.4))]" />
        <div className="relative z-10 px-12 pt-14">
          <LeafIcon className="mb-1 size-8 text-[var(--color-green-deep)]" />
          <p className="font-display text-[4.25rem] leading-none text-[var(--color-green-deep)]">Dear Days</p>
          <p className="font-display mt-3 text-xl text-[var(--color-green-deep)]/85">Little moments, kept forever.</p>
        </div>
        <div className="absolute bottom-12 right-10 z-10 grid w-52 gap-4">
          {POLAROIDS.map(({ caption, theme, className }) => (
            <figure className={`bg-[var(--color-paper)] p-2.5 pb-5 shadow-[var(--shadow-soft)] ${className}`} key={caption}>
              <RoomCover className="aspect-[4/3]" theme={theme} />
              <figcaption className="font-display mt-2.5 text-center text-xs italic text-[var(--color-muted)]">{caption}</figcaption>
            </figure>
          ))}
        </div>
        <p className="font-display absolute bottom-12 left-12 z-10 max-w-48 text-xl italic leading-snug text-[var(--color-paper)]">
          Same people,<br />brighter days.
        </p>
      </section>

      <section className="flex flex-col justify-center bg-[var(--color-cream-50)] px-6 py-10 sm:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link className="font-display mb-8 block text-2xl text-[var(--color-green-deep)] lg:hidden" href="/">Dear Days</Link>
          <p className="mb-5 flex items-center gap-1.5 text-[0.7rem] font-medium text-[var(--color-muted)]">
            <LockIcon className="size-3.5" /> Private by design
          </p>
          <h1 className="title-xl">{copy.title}</h1>
          <p className="mt-2.5 text-sm leading-6 text-[var(--color-muted)]">{copy.lead}</p>

          <form className="mt-7 grid gap-4" method="post" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <div>
                <label className="field-label" htmlFor="display-name">Display name</label>
                <input autoComplete="nickname" className="field-input" id="display-name" name="display_name" placeholder="e.g. Sea" required />
              </div>
            ) : null}
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input autoComplete="email" className="field-input pl-9" id="email" name="email" placeholder="you@example.com" required type="email" />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="field-input px-9" id="password" minLength={8} name="password" placeholder="Your password" required type={showPassword ? "text" : "password"} />
                <button aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" onClick={() => setShowPassword((value) => !value)} type="button">
                  <EyeIcon className="size-4" />
                </button>
              </div>
              {mode === "sign-in" ? (
                <p className="mt-1.5 text-right text-xs"><span className="text-[var(--color-muted)] underline underline-offset-4">Forgot password?</span></p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">At least 8 characters</p>
              )}
            </div>
            {error ? <p className="rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{error}</p> : null}
            {notice ? <p className="rounded-lg bg-[var(--color-sage)] px-3 py-2 text-xs text-[var(--color-green-deep)]" role="status">{notice}</p> : null}
            <button className="btn btn-primary w-full disabled:opacity-60" disabled={pending || !hydrated} type="submit">{pending ? "Please wait…" : copy.submit} <ArrowRightIcon className="size-4" /></button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" /> or <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <Link className="btn btn-secondary w-full" href={next === "/" ? copy.altHref : `${copy.altHref}?next=${encodeURIComponent(next)}`}>{copy.altLabel}</Link>
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">{copy.altText}</p>
        </div>
      </section>
    </div>
  );
}
