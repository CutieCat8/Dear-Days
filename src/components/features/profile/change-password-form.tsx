"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

import { dataMode } from "@/lib/data/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const passwordSchema = z.object({
  current_password: z.string().min(1, "Please enter your current password"),
  new_password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
  confirm_password: z.string(),
}).superRefine((value, context) => {
  if (value.new_password !== value.confirm_password) context.addIssue({ code: "custom", path: ["confirm_password"], message: "Passwords do not match" });
  if (value.new_password && value.new_password === value.current_password) context.addIssue({ code: "custom", path: ["new_password"], message: "Choose a different password" });
});

type FieldName = keyof z.infer<typeof passwordSchema>;

const FIELDS: { name: FieldName; label: string; placeholder: string; autoComplete: string }[] = [
  { name: "current_password", label: "Current password", placeholder: "Enter current password", autoComplete: "current-password" },
  { name: "new_password", label: "New password", placeholder: "Enter new password", autoComplete: "new-password" },
  { name: "confirm_password", label: "Confirm new password", placeholder: "Confirm new password", autoComplete: "new-password" },
];

/** Signed-in password change. `updateUser` does not check the old password, so it is verified by signing in with it first. */
export function ChangePasswordForm({ email }: { email: string | null }) {
  const demo = dataMode() === "mock" || !email;
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(FIELDS.map(({ name }) => [name, String(new FormData(form).get(name) ?? "")]));
    setMessage(null);

    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as FieldName] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const verify = await supabase.auth.signInWithPassword({ email, password: parsed.data.current_password });
      if (verify.error) {
        if (verify.error.status === 429) setMessage({ kind: "error", text: "Too many attempts. Please wait a moment and try again." });
        else setErrors({ current_password: "Current password is incorrect" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
      if (error) {
        setMessage({ kind: "error", text: error.status === 422 ? "Please choose a stronger password." : "We could not update your password. Please try again." });
        return;
      }
      form.reset();
      setMessage({ kind: "ok", text: "Password updated." });
    } catch {
      setMessage({ kind: "error", text: "We could not reach the server. Please check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <div>
        <h2 className="title-md">Change password</h2>
        <p className="text-xs text-[var(--color-muted)]">Use a strong password to keep your account safe.</p>
      </div>
      {FIELDS.map(({ name, label, placeholder, autoComplete }) => {
        const id = name.replaceAll("_", "-");
        return (
          <div className="grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4" key={name}>
            <label className="field-label !mb-0" htmlFor={id}>{label}</label>
            <div>
              <input aria-describedby={errors[name] ? `${id}-error` : undefined} aria-invalid={Boolean(errors[name])} autoComplete={autoComplete} className="field-input" disabled={demo} id={id} maxLength={72} name={name} placeholder={placeholder} required type="password" />
              {errors[name] ? <p className="mt-1.5 text-xs text-[#8a3a3a]" id={`${id}-error`}>{errors[name]}</p> : null}
            </div>
          </div>
        );
      })}
      {message ? <p className={`rounded-lg px-3 py-2 text-xs ${message.kind === "ok" ? "bg-[var(--color-sage)] text-[var(--color-green-deep)]" : "bg-[#f8e3e3] text-[#8a3a3a]"}`} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p> : null}
      <div className="sm:pl-[calc(8.5rem+1rem)]">
        <button className="btn btn-secondary min-w-36 disabled:opacity-60" disabled={pending || demo} type="submit">{pending ? "Updating…" : "Update password"}</button>
      </div>
      {demo ? <p className="text-xs text-[var(--color-muted)]">Demo mode: sign in with a real account to change your password.</p> : null}
    </form>
  );
}
