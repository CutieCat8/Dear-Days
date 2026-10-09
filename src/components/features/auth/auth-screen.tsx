"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ArrowRightIcon, EyeIcon, LeafIcon, LockIcon, MailIcon } from "@/components/shared/icons";
import { RoomCover } from "@/components/shared/room-cover";
import { signInAction, signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { authPathWithNext } from "@/lib/auth/paths";

type AuthScreenProps = {
  mode: "sign-in" | "sign-up";
  /** Already-sanitized path to return to after auth (see safeNextPath). */
  next: string;
};

const INITIAL_STATE: AuthFormState = {};

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-[var(--color-danger)]" id={id}>{messages[0]}</p>;
}

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

export function AuthScreen({ mode, next }: AuthScreenProps) {
  const copy = COPY[mode];
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(mode === "sign-in" ? signInAction : signUpAction, INITIAL_STATE);
  const fieldErrors = state.error?.field_errors ?? {};
  const formMessage = state.error && state.error.code !== "VALIDATION_ERROR" ? state.error.message : null;

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

          <form action={formAction} className="mt-7 grid gap-4" noValidate>
            <input name="next" type="hidden" value={next} />
            {formMessage ? (
              <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">{formMessage}</p>
            ) : null}
            {state.notice ? (
              <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-green-deep)]" role="status">{state.notice}</p>
            ) : null}
            {mode === "sign-up" ? (
              <div>
                <label className="field-label" htmlFor="display-name">Display name</label>
                <input aria-describedby={fieldErrors.display_name ? "display-name-error" : undefined} aria-invalid={Boolean(fieldErrors.display_name)} autoComplete="nickname" className="field-input" defaultValue={state.values?.display_name} id="display-name" maxLength={50} name="display_name" placeholder="e.g. Sea" required />
                <FieldError id="display-name-error" messages={fieldErrors.display_name} />
              </div>
            ) : null}
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input aria-describedby={fieldErrors.email ? "email-error" : undefined} aria-invalid={Boolean(fieldErrors.email)} autoComplete="email" className="field-input pl-9" defaultValue={state.values?.email} id="email" name="email" placeholder="you@example.com" required type="email" />
              </div>
              <FieldError id="email-error" messages={fieldErrors.email} />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input aria-describedby={fieldErrors.password ? "password-error" : undefined} aria-invalid={Boolean(fieldErrors.password)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="field-input px-9" id="password" maxLength={72} minLength={mode === "sign-up" ? 8 : undefined} name="password" placeholder="Your password" required type={showPassword ? "text" : "password"} />
                <button aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-green-deep)]" onClick={() => setShowPassword((value) => !value)} type="button">
                  <EyeIcon className="size-4" />
                </button>
              </div>
              <FieldError id="password-error" messages={fieldErrors.password} />
              {mode === "sign-in" ? (
                // TODO(R4): wire to a reset-password flow once Supabase email is configured, or remove for the MVP.
                <p className="mt-1.5 text-right text-xs"><span className="text-[var(--color-muted)] underline underline-offset-4">Forgot password?</span></p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">At least 8 characters</p>
              )}
            </div>
            <button aria-disabled={pending} className="btn btn-primary w-full" disabled={pending} type="submit">
              {pending ? (mode === "sign-in" ? "Signing in…" : "Creating account…") : <>{copy.submit} <ArrowRightIcon className="size-4" /></>}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" /> or <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <Link className="btn btn-secondary w-full" href={authPathWithNext(copy.altHref, next)}>{copy.altLabel}</Link>
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">{copy.altText}</p>
        </div>
      </section>
    </div>
  );
}
