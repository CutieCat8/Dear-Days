"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { dataMode } from "@/lib/data/config";
import { updateMyAccount } from "@/lib/data/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileFormProps = { displayName: string; bio: string | null; email: string | null; username: string | null };

const BIO_MAX = 160;
const ROW = "grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4";

export function ProfileForm({ displayName: initialName, bio: initialBio, email, username: initialUsername }: ProfileFormProps) {
  const router = useRouter();
  const demo = dataMode() === "mock";
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    // only send the username when it changed, so an untouched form never trips the uniqueness check
    const changedUsername = initialUsername !== null && username.trim().replace(/^@+/, "").toLowerCase() !== initialUsername ? username : undefined;
    const result = await updateMyAccount(createSupabaseBrowserClient(), { display_name: displayName, bio, username: changedUsername });
    setPending(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error.message });
      return;
    }
    setMessage({ kind: "ok", text: "Saved." });
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      <div>
        <h2 className="title-md">Account settings</h2>
        <p className="text-xs text-[var(--color-muted)]">Keep your information up to date.</p>
      </div>
      <div className={ROW}>
        <label className="field-label !mb-0" htmlFor="display-name">Display name</label>
        <input className="field-input" disabled={demo} id="display-name" maxLength={50} name="display_name" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
      </div>
      {initialUsername !== null ? (
        <div className={ROW}>
          <label className="field-label !mb-0" htmlFor="username">Username</label>
          <div>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">@</span>
              <input aria-describedby="username-hint" autoCapitalize="none" autoComplete="username" className="field-input pl-8" disabled={demo} id="username" maxLength={31} name="username" onChange={(event) => setUsername(event.target.value)} spellCheck={false} value={username} />
            </div>
            <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]" id="username-hint">Friends find you with this. 3–30 letters, numbers, dots or underscores.</p>
          </div>
        </div>
      ) : null}
      {email ? (
        <div className={ROW}>
          <label className="field-label !mb-0" htmlFor="email">Email address</label>
          <div>
            {/* E-mail lives in Supabase Auth; changing it needs a confirmation round trip that is not part of the MVP. */}
            <input aria-describedby="email-hint" className="field-input bg-[var(--color-cream-100)] text-[var(--color-muted)]" id="email" readOnly type="email" value={email} />
            <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]" id="email-hint">Only you can see your email.</p>
          </div>
        </div>
      ) : null}
      <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
        <label className="field-label !mb-0 sm:pt-2.5" htmlFor="bio">About you <small>(optional)</small></label>
        <div>
          <textarea className="field-input !min-h-20" disabled={demo} id="bio" maxLength={BIO_MAX} name="bio" onChange={(event) => setBio(event.target.value)} placeholder="A line about the days you like to keep" value={bio} />
          <p className="mt-1 text-right text-[0.7rem] text-[var(--color-muted)]">{bio.length}/{BIO_MAX}</p>
        </div>
      </div>
      {message ? <p className={`rounded-lg px-3 py-2 text-xs ${message.kind === "ok" ? "bg-[var(--color-sage)] text-[var(--color-green-deep)]" : "bg-[#f8e3e3] text-[#8a3a3a]"}`} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p> : null}
      <div className="sm:pl-[calc(8.5rem+1rem)]">
        <button className="btn btn-primary min-w-36 disabled:opacity-60" disabled={pending || demo} type="submit">{pending ? "Saving…" : "Save changes"}</button>
      </div>
      {demo ? <p className="text-xs text-[var(--color-muted)]">Demo mode: profile changes are not saved.</p> : null}
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const demo = dataMode() === "mock";

  async function signOut() {
    setPending(true);
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh(); // drop cached private pages
  }

  return (
    <button className="btn btn-secondary btn-sm border-[#8a3a3a]/40 text-[#8a3a3a] disabled:opacity-60" disabled={pending || demo} onClick={signOut} type="button">{pending ? "Signing out…" : "Sign out"}</button>
  );
}
