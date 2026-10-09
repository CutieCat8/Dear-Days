"use client";

import { useActionState } from "react";

import { changePasswordAction, type ChangePasswordState } from "@/lib/auth/actions";

const INITIAL_STATE: ChangePasswordState = {};

const FIELDS = [
  { name: "current_password", label: "Current password", placeholder: "Enter current password", autoComplete: "current-password" },
  { name: "new_password", label: "New password", placeholder: "Enter new password", autoComplete: "new-password" },
  { name: "confirm_password", label: "Confirm new password", placeholder: "Confirm new password", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL_STATE);
  const fieldErrors = state.error?.field_errors ?? {};
  const formError = state.error && state.error.code !== "VALIDATION_ERROR" ? state.error.message : null;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div>
        <h2 className="title-md">Change password</h2>
        <p className="text-xs text-[var(--color-muted)]">Use a strong password to keep your account safe.</p>
      </div>
      {formError ? <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">{formError}</p> : null}

      {FIELDS.map((field) => {
        const error = fieldErrors[field.name]?.[0];
        const id = field.name.replaceAll("_", "-");
        return (
          <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4" key={field.name}>
            <label className="field-label !mb-0" htmlFor={id}>{field.label}</label>
            <div>
              <input
                aria-describedby={error ? `${id}-error` : undefined}
                aria-invalid={Boolean(error)}
                autoComplete={field.autoComplete}
                className="field-input"
                id={id}
                maxLength={72}
                name={field.name}
                placeholder={field.placeholder}
                required
                type="password"
              />
              {error ? <p className="mt-1.5 text-xs text-[var(--color-danger)]" id={`${id}-error`}>{error}</p> : null}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3 sm:pl-[calc(8.5rem+1rem)]">
        <button aria-disabled={pending} className="btn btn-secondary min-w-36" disabled={pending} type="submit">{pending ? "Updating…" : "Update password"}</button>
        <p aria-live="polite" className="text-xs text-[var(--color-sage-strong)]">{state.done && !pending ? "Password updated" : ""}</p>
      </div>
    </form>
  );
}
