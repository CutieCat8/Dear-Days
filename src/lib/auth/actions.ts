"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { changePasswordSchema, signInSchema, signUpSchema } from "@/lib/contracts/schemas";
import type { DataError } from "@/lib/contracts/types";
import { mockDb } from "@/lib/data/mock-store";
import { isMockAuthMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SIGN_IN_PATH, safeNextPath } from "./paths";

export type AuthFormState = {
  error?: DataError;
  /** Non-error message, e.g. "check your email" after sign-up when email confirmation is on. */
  notice?: string;
  /** Echoed back so the form keeps what the user typed. Passwords are never echoed. */
  values?: { email?: string; display_name?: string };
};

function readForm(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

function validationError(error: z.ZodError): DataError {
  const field_errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (field_errors[key] ??= []).push(issue.message);
  }
  return { code: "VALIDATION_ERROR", message: "Please check the highlighted fields.", field_errors };
}

function mapAuthError(error: AuthError): DataError {
  switch (error.code) {
    case "invalid_credentials":
      return { code: "UNAUTHENTICATED", message: "Email or password is incorrect." };
    case "email_not_confirmed":
      return { code: "UNAUTHENTICATED", message: "Please confirm your email address before signing in." };
    case "user_already_exists":
    case "email_exists":
      return { code: "CONFLICT", message: "An account with this email already exists. Try signing in." };
    case "weak_password":
      return { code: "VALIDATION_ERROR", message: "Please choose a stronger password.", field_errors: { password: [error.message] } };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { code: "INTERNAL_ERROR", message: "Too many attempts. Please wait a moment and try again.", retryable: true };
    case "signup_disabled":
      return { code: "FORBIDDEN", message: "New sign-ups are currently closed." };
    default:
      return { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", retryable: true };
  }
}

const NOT_CONFIGURED: DataError = { code: "INTERNAL_ERROR", message: "Sign-in is not available right now." };

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = readForm(formData, ["email", "password"]);
  const next = safeNextPath(formData.get("next"));
  const values = { email: raw.email };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { error: validationError(parsed.error), values };

  if (!isMockAuthMode()) {
    let supabase;
    try {
      supabase = await createSupabaseServerClient();
    } catch {
      return { error: NOT_CONFIGURED, values };
    }
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: mapAuthError(error), values };
  }

  redirect(next);
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = readForm(formData, ["display_name", "email", "password"]);
  const next = safeNextPath(formData.get("next"));
  const values = { email: raw.email, display_name: raw.display_name };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { error: validationError(parsed.error), values };

  if (!isMockAuthMode()) {
    let supabase;
    try {
      supabase = await createSupabaseServerClient();
    } catch {
      return { error: NOT_CONFIGURED, values };
    }
    const { email, password, display_name } = parsed.data;
    // display_name goes into user metadata so a database trigger (R2, database owner) can create the profiles row.
    // TODO(R4/R2): if the team instead creates profiles from the app, upsert into `profiles` here after sign-up.
    // TODO(R4): if "Confirm email" is on, add `emailRedirectTo` pointing at an /auth/confirm route handler.
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name } } });
    if (error) return { error: mapAuthError(error), values };

    // No session means Supabase is waiting for email confirmation. An existing email also lands here
    // (Supabase hides it to prevent account enumeration), so the message stays neutral.
    if (!data.session) {
      return { notice: `If ${email} can be registered, we've sent a confirmation link. Open it to finish creating your account.`, values };
    }
  }

  redirect(next);
}

export type ChangePasswordState = { error?: DataError; done?: boolean };

const WRONG_CURRENT_PASSWORD: DataError = {
  code: "VALIDATION_ERROR",
  message: "Please check the highlighted fields.",
  field_errors: { current_password: ["Current password is incorrect"] },
};

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse(readForm(formData, ["current_password", "new_password", "confirm_password"]));
  if (!parsed.success) return { error: validationError(parsed.error) };
  const { current_password, new_password } = parsed.data;

  if (isMockAuthMode()) {
    // Mock mode keeps a fake password in memory so the form can be exercised without Supabase.
    const db = mockDb();
    if (current_password !== db.currentUserPassword) return { error: WRONG_CURRENT_PASSWORD };
    db.currentUserPassword = new_password;
    return { done: true };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: NOT_CONFIGURED };
  }
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (!email) return { error: { code: "UNAUTHENTICATED", message: "Please sign in again." } };

  // updateUser() does not check the old password, so verify it first by signing in with it.
  const verify = await supabase.auth.signInWithPassword({ email, password: current_password });
  if (verify.error) return { error: verify.error.code === "invalid_credentials" ? WRONG_CURRENT_PASSWORD : mapAuthError(verify.error) };
  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) return { error: mapAuthError(error) };
  return { done: true };
}

export async function signOutAction() {
  if (!isMockAuthMode()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Still leave the app; the proxy will send anyone without a valid session back to sign-in.
    }
  }
  redirect(SIGN_IN_PATH);
}
