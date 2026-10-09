"use client";

import { useActionState } from "react";

import { updateProfileAction, type ProfileFormState } from "@/lib/data/profile-actions";

type ProfileFormProps = {
  displayName: string;
};

const INITIAL_STATE: ProfileFormState = {};

export function ProfileForm({ displayName }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, INITIAL_STATE);
  const nameError = state.error?.field_errors?.display_name?.[0];
  const formError = state.error && !nameError ? state.error.message : null;

  return (
    <form action={formAction} className="panel grid content-start gap-4 p-5" noValidate>
      <div>
        <h2 className="title-md">Account settings</h2>
        <p className="text-xs text-[var(--color-muted)]">Your display name is what the other member of your rooms sees.</p>
      </div>
      {formError ? <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">{formError}</p> : null}
      <div>
        <label className="field-label" htmlFor="display-name">Display name</label>
        <input
          aria-describedby={nameError ? "display-name-error" : undefined}
          aria-invalid={Boolean(nameError)}
          autoComplete="nickname"
          className="field-input"
          defaultValue={state.saved?.display_name ?? displayName}
          id="display-name"
          maxLength={50}
          name="display_name"
          required
        />
        {nameError ? <p className="mt-1.5 text-xs text-[var(--color-danger)]" id="display-name-error">{nameError}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <button aria-disabled={pending} className="btn btn-primary self-start" disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</button>
        <p aria-live="polite" className="text-xs text-[var(--color-sage-strong)]">{state.saved && !pending ? "Saved" : ""}</p>
      </div>
    </form>
  );
}
