import type { SupabaseClient } from "@supabase/supabase-js";

import type { DataResult } from "@/lib/contracts/types";
import type { Database } from "@/lib/supabase/database.types";

import { fail, failFrom, ok } from "./result";
import { getSessionUser } from "./session";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_URL_SECONDS = 60 * 60;
export const PROFILE_MEDIA_CONSTRAINTS = {
  maxFileBytes: 5 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export type ProfileMediaKind = "avatar" | "cover";
export type SavedProfileMedia = { path: string; signed_url: string | null };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function validateProfileMediaFile(file: File): string | null {
  if (file.size === 0) return "The selected image is empty.";
  if (!(PROFILE_MEDIA_CONSTRAINTS.acceptedMimeTypes as readonly string[]).includes(file.type)) {
    return "Only JPEG, PNG and WebP images are supported.";
  }
  if (file.size > PROFILE_MEDIA_CONSTRAINTS.maxFileBytes) return "Profile images must be 5 MB or smaller.";
  return null;
}

/** Storage policies depend on this exact {user}/{kind}/{uuid}.{safe-extension} convention. */
export function profileMediaPath(userId: string, kind: ProfileMediaKind, mediaId: string, mime: string) {
  return `${userId}/${kind}/${mediaId}.${EXTENSIONS[mime] ?? "bin"}`;
}

/** Generates short-lived display URLs. Missing/denied objects resolve to null so callers can show initials/defaults. */
export async function signedProfileMediaUrls(client: SupabaseClient<Database>, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data, error } = await client.storage.from(PROFILE_MEDIA_BUCKET).createSignedUrls(unique, PROFILE_MEDIA_URL_SECONDS);
  if (error || !data) return urls;
  for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  return urls;
}

/**
 * Uploads a fresh object, persists its path, then deletes the previous object.
 * A failed profile update cleans up the new upload and leaves the old path/object untouched.
 */
export async function saveProfileMedia(
  client: SupabaseClient<Database>,
  kind: ProfileMediaKind,
  file: File,
  previousPath: string | null,
  newId: () => string = () => crypto.randomUUID(),
): Promise<DataResult<SavedProfileMedia>> {
  const validationError = validateProfileMediaFile(file);
  if (validationError) return fail("VALIDATION_ERROR", validationError, { field_errors: { [kind]: [validationError] } });

  const user = await getSessionUser(client);
  if (!user) return fail("UNAUTHENTICATED", "Please sign in to continue.");
  const path = profileMediaPath(user.id, kind, newId(), file.type);
  const bucket = client.storage.from(PROFILE_MEDIA_BUCKET);
  const uploaded = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) return fail("UPLOAD_FAILED", "The image could not be uploaded. Your current image was not changed.", { retryable: true });

  const update = kind === "avatar" ? { avatar_path: path } : { cover_path: path };
  const { data, error } = await client.from("profiles").update(update).eq("user_id", user.id).select("user_id");
  if (error || !data?.length) {
    await bucket.remove([path]);
    return error ? failFrom(error) : fail("FORBIDDEN", "Your profile image could not be changed.");
  }

  // Delete only an old object belonging to this user. A malformed legacy value is never used as a delete target.
  if (previousPath?.startsWith(`${user.id}/${kind}/`) && previousPath !== path) await bucket.remove([previousPath]);
  const signed = await bucket.createSignedUrl(path, PROFILE_MEDIA_URL_SECONDS);
  return ok({ path, signed_url: signed.data?.signedUrl ?? null });
}
