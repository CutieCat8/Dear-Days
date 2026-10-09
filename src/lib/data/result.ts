import type { z } from "zod";

import type { AppErrorCode, DataError, DataResult } from "@/lib/contracts/types";

export function ok<T>(data: T): DataResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: AppErrorCode, message: string, extra: Partial<DataError> = {}): DataResult<T> {
  return { ok: false, error: { code, message, ...extra } };
}

/** Flattens Zod issues into `field_errors` keyed by dotted path (e.g. `title`, `media.order`). */
export function validationFailure<T = never>(error: z.ZodError): DataResult<T> {
  const field_errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    (field_errors[key] ??= []).push(issue.message);
  }
  return fail("VALIDATION_ERROR", "Please check the highlighted fields.", { field_errors });
}
