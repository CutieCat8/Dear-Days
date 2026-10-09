"use client";

import { useActionState, useState } from "react";

import { updateProfileAction, type ProfileFormState } from "@/lib/data/profile-actions";

type ProfileFormProps = {
  displayName: string;
  bio: string | null;
  email: string;
};

const INITIAL_STATE: ProfileFormState = {};
const BIO_MAX = 160;

export function ProfileForm({ displayName, bio, email }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, INITIAL_STATE);
  const savedBio = state.saved ? state.saved.bio ?? "" : bio ?? "";
  const [bioLength, setBioLength] = useState(savedBio.length);
  const fieldErrors = state.error?.field_errors ?? {};
  const formError = state.error && !fieldErrors.display_name && !fieldErrors.bio ? state.error.message : null;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div>
        <h2 className="title-md">Account settings</h2>
        <p className="text-xs text-[var(--color-muted)]">Keep your information up to date.</p>
      </div>
      {formError ? <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">{formError}</p> : null}

      <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4">
        <label className="field-label !mb-0" htmlFor="display-name">Display name</label>
        <div>
          <input
            aria-describedby={fieldErrors.display_name ? "display-name-error" : undefined}
            aria-invalid={Boolean(fieldErrors.display_name)}
            autoComplete="nickname"
            className="field-input"
            defaultValue={state.saved?.display_name ?? displayName}
            id="display-name"
            maxLength={50}
            name="display_name"
            required
          />
          {fieldErrors.display_name ? <p className="mt-1.5 text-xs text-[var(--color-danger)]" id="display-name-error">{fieldErrors.display_name[0]}</p> : null}
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4">
        <label className="field-label !mb-0" htmlFor="email">Email address</label>
        <div>
          {/* Email belongs to Supabase Auth; changing it needs a confirmation flow that is outside the MVP. */}
          <input aria-describedby="email-hint" className="field-input bg-[var(--color-cream-100)] text-[var(--color-muted)]" id="email" readOnly type="email" value={email} />
          <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]" id="email-hint">Only you can see your email.</p>
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
        <label className="field-label !mb-0 sm:pt-2.5" htmlFor="bio">About you <small>(optional)</small></label>
        <div>
          <textarea
            aria-describedby={fieldErrors.bio ? "bio-error" : undefined}
            aria-invalid={Boolean(fieldErrors.bio)}
            className="field-input !min-h-20"
            defaultValue={savedBio}
            id="bio"
            maxLength={BIO_MAX}
            name="bio"
            onChange={(event) => setBioLength(event.target.value.length)}
            placeholder="A line about the days you like to keep"
          />
          <div className="mt-1 flex justify-between gap-3">
            {fieldErrors.bio ? <p className="text-xs text-[var(--color-danger)]" id="bio-error">{fieldErrors.bio[0]}</p> : null}
            <p className="ml-auto text-[0.7rem] text-[var(--color-muted)]">{bioLength}/{BIO_MAX}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:pl-[calc(8.5rem+1rem)]">
        <button aria-disabled={pending} className="btn btn-primary min-w-36" disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</button>
        <p aria-live="polite" className="text-xs text-[var(--color-sage-strong)]">{state.saved && !pending ? "Saved" : ""}</p>
      </div>
    </form>
  );
}
