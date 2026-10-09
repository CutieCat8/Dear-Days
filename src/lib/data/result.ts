import type { AppErrorCode, DataError, DataResult } from "@/lib/contracts/types";

export function ok<T>(data: T): DataResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: AppErrorCode, message: string, extra: Partial<Omit<DataError, "code" | "message">> = {}): DataResult<T> {
  return { ok: false, error: { code, message, ...extra } };
}

const MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We could not find that.",
  VALIDATION_ERROR: "Some of the information is not valid.",
  CONFLICT: "That already exists.",
  ROOM_FULL: "This room already has two people.",
  INVALID_INVITE_CODE: "That invite code is not valid.",
  UPLOAD_FAILED: "A photo could not be uploaded. Nothing was saved, please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

type PgLikeError = { message?: string; code?: string; details?: string; hint?: string; status?: number } | null | undefined;

/**
 * Maps a Postgres / PostgREST / Supabase error to the contract's error codes.
 * Our SQL functions raise their code as the message (ROOM_FULL, FORBIDDEN, ...), constraints map by SQLSTATE.
 */
export function mapDatabaseError(error: PgLikeError): DataError {
  const message = error?.message ?? "";
  const known: AppErrorCode[] = ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "ROOM_FULL", "INVALID_INVITE_CODE"];
  const direct = known.find((code) => message === code || message.startsWith(`${code}:`));
  if (direct) return { code: direct, message: MESSAGES[direct] };

  switch (error?.code) {
    case "28000":
    case "PGRST301":
    case "PGRST302":
      return { code: "UNAUTHENTICATED", message: MESSAGES.UNAUTHENTICATED };
    case "42501": // insufficient_privilege (also RLS violations)
      return { code: "FORBIDDEN", message: MESSAGES.FORBIDDEN };
    case "23514": // check_violation
    case "23502": // not_null_violation
    case "22P02": // invalid_text_representation
    case "22007": // invalid_datetime_format
    case "23503": // foreign_key_violation
      return { code: "VALIDATION_ERROR", message: MESSAGES.VALIDATION_ERROR };
    case "23505": // unique_violation
      return { code: "CONFLICT", message: MESSAGES.CONFLICT };
    case "PGRST116": // no rows for .single()
      return { code: "NOT_FOUND", message: MESSAGES.NOT_FOUND };
    default:
      return { code: "INTERNAL_ERROR", message: MESSAGES.INTERNAL_ERROR, retryable: true };
  }
}

export function failFrom<T = never>(error: PgLikeError): DataResult<T> {
  return { ok: false, error: mapDatabaseError(error) };
}
