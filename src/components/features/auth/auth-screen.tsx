"use client";

import { Caveat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";

import { signInAsDemo } from "@/app/(auth)/sign-in/actions";

import { ArrowRightIcon, EyeIcon, LeafIcon, LockIcon, MailIcon } from "@/components/shared/icons";
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
    altHref: "/sign-up",
    altLabel: "Create account",
  },
  "sign-up": {
    title: "Start your diary",
    lead: "Create an account to open your private room of memories.",
    submit: "Create account",
    altHref: "/sign-in",
    altLabel: "Sign in",
  },
} as const;

const script = Caveat({ subsets: ["latin"], variable: "--font-script", display: "swap" });

// Positions are percentages of the left panel so the stack keeps its shape at any size; the frames bleed off the right edge on purpose.
const POLAROIDS = [
  { src: "/auth/login1.jpg", caption: null, className: "-top-[14%] -right-[2%] h-[52%] w-[36%] rotate-[6deg]", photo: "h-full" },
  { src: "/auth/login2.jpg", caption: null, className: "top-[34%] right-[1%] w-[31%] -rotate-[3.5deg]", photo: "aspect-square" },
  { src: "/auth/login3.jpg", caption: "Different days, same happiness ♡", className: "top-[66%] -right-[1%] w-[32%] rotate-[4deg]", photo: "aspect-[3/2]" },
] as const;

export function AuthScreen({ mode, next = "/" }: AuthScreenProps) {
  const copy = COPY[mode];
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const [demoState, demoAction, demoPending] = useActionState(signInAsDemo, { error: null });

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
    <div className={`${script.variable} grid min-h-screen lg:grid-cols-[1.1fr_1fr]`}>
      <section aria-hidden="true" className="relative hidden overflow-hidden lg:block">
        <Image alt="" className="object-cover" fill priority sizes="60vw" src="/auth/background.jpg" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(250_240_220/0.35),rgb(250_240_220/0)_45%,rgb(31_65_54/0.35))]" />
        <div className="relative z-10 px-12 pt-14">
          <LeafIcon className="mb-1 size-8 text-[var(--color-green-deep)]" />
          <p className="font-display text-[4.25rem] leading-none text-[var(--color-green-deep)]">Dear Days</p>
          <p className="font-display mt-3 text-xl text-[var(--color-green-deep)]/85">Little moments, kept forever.</p>
          <p className="mt-16 text-xl leading-snug text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.35)] [font-family:var(--font-script)] -rotate-6">
            Same people<br />Brighter days<br />In Chiang Mai <span className="text-base">♡</span>
          </p>
        </div>
        {POLAROIDS.map(({ src, caption, className, photo }) => (
          <figure className={`absolute z-10 bg-[#f5efe2] p-[7px] shadow-[var(--shadow-soft)] ${caption ? "pb-12" : "pb-[7px]"} ${className}`} key={src}>
            <div className={`relative ${photo}`}>
              <Image alt="" className="object-cover" fill sizes="20vw" src={src} />
            </div>
            {caption ? <figcaption className="absolute inset-x-0 bottom-3 text-center text-base text-[var(--color-muted)] [font-family:var(--font-script)]">{caption}</figcaption> : null}
          </figure>
        ))}
      </section>

      <section className="relative flex flex-col bg-[var(--color-cream-50)] px-6 py-8 sm:px-14">
        <div className="hidden items-center justify-end gap-4 text-xs text-[var(--color-green-deep)] lg:flex">
          <span className="font-display flex items-center gap-1.5">A personal photo diary <LeafIcon className="size-3.5" /></span>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <Link className="font-display mb-8 block text-2xl text-[var(--color-green-deep)] lg:hidden" href="/">Dear Days</Link>
          <h1 className="title-xl">{copy.title}</h1>
          <p className="font-display mt-3 text-base leading-6 text-[var(--color-green-deep)]/80">{copy.lead}</p>

          <form className="mt-9 grid gap-4" method="post" onSubmit={handleSubmit}>
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
                <p className="mt-1.5 text-right text-xs"><span className="font-display text-[var(--color-green-deep)] underline underline-offset-4">Forgot password?</span></p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">At least 8 characters</p>
              )}
            </div>
            {error ? <p className="rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{error}</p> : null}
            {notice ? <p className="rounded-lg bg-[var(--color-sage)] px-3 py-2 text-xs text-[var(--color-green-deep)]" role="status">{notice}</p> : null}
            <button className="btn btn-primary font-display w-full !text-base disabled:opacity-60" disabled={pending || !hydrated} type="submit">{pending ? "Please wait…" : copy.submit} <ArrowRightIcon className="size-4" /></button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" /> or <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <Link className="btn btn-secondary font-display w-full !text-base" href={next === "/" ? copy.altHref : `${copy.altHref}?next=${encodeURIComponent(next)}`}>{copy.altLabel}</Link>
          {mode === "sign-in" && dataMode() === "supabase" ? (
            <form action={demoAction} className="mt-5 text-center">
              <input name="next" type="hidden" value={next} />
              <p className="text-xs text-[var(--color-muted)]">Just looking around? Explore a diary full of memories.</p>
              <button className="font-display mt-1.5 text-sm text-[var(--color-green-deep)] underline underline-offset-4 disabled:opacity-60" disabled={demoPending || !hydrated} type="submit">{demoPending ? "Opening demo…" : "Try the demo account"}</button>
              {demoState.error ? <p className="mt-2 rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{demoState.error}</p> : null}
            </form>
          ) : null}
        </div>
        <div className="hidden items-center justify-center gap-3 pb-2 text-[var(--color-green-deep)]/70 lg:flex">
          <LeafIcon className="size-8" />
          <p className="text-base leading-tight [font-family:var(--font-script)] -rotate-6">More photos<br />A kinder tomorrow<br />Same us ♡</p>
        </div>
      </section>
    </div>
  );
}
