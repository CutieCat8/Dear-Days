"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { dataMode } from "@/lib/data/config";
import { updateMyAccount } from "@/lib/data/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileFormProps = { displayName: string; bio: string | null; email: string | null };

export function ProfileForm({ displayName: initialName, bio: initialBio, email }: ProfileFormProps) {
  const router = useRouter();
  const demo = dataMode() === "mock";
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    const result = await updateMyAccount(createSupabaseBrowserClient(), { display_name: displayName, bio });
    setPending(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error.message });
      return;
    }
    setMessage({ kind: "ok", text: "Saved." });
    router.refresh();
  }

  return (
    <form className="panel grid gap-4 p-5" onSubmit={save}>
      <div>
        <h2 className="title-md">Account settings</h2>
        <p className="text-xs text-[var(--color-muted)]">{email ? `Signed in as ${email}` : "Keep your information up to date."}</p>
      </div>
      <div>
        <label className="field-label" htmlFor="display-name">Display name</label>
        <input className="field-input" disabled={demo} id="display-name" maxLength={50} name="display_name" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
      </div>
      <div>
        <label className="field-label" htmlFor="bio">About you <small>(optional)</small></label>
        <textarea className="field-input !min-h-24" disabled={demo} id="bio" maxLength={160} name="bio" onChange={(event) => setBio(event.target.value)} value={bio} />
      </div>
      {message ? <p className={`rounded-lg px-3 py-2 text-xs ${message.kind === "ok" ? "bg-[var(--color-sage)] text-[var(--color-green-deep)]" : "bg-[#f8e3e3] text-[#8a3a3a]"}`} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p> : null}
      <button className="btn btn-primary self-start disabled:opacity-60" disabled={pending || demo} type="submit">{pending ? "Saving…" : "Save changes"}</button>
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
    <button className="btn btn-secondary self-start disabled:opacity-60" disabled={pending || demo} onClick={signOut} type="button">{pending ? "Signing out…" : "Sign out"}</button>
  );
}
