"use server";

import { revalidatePath } from "next/cache";

import type { DataResult, MemoryInput, NewMediaUpload } from "@/lib/contracts/types";

import { UPLOAD_FIELD_PREFIX } from "./form-fields";
import { createMemory, deleteMemory, updateMemory } from "./memories";
import { fail } from "./result";

type Saved = { id: string; room_id: string };

/**
 * Form boundary for New/Edit Memory. FormData carries `input` (MemoryInput as JSON) plus one
 * `upload:<client_id>` file per entry in `input.media.added`. The data function re-validates everything.
 */
export async function saveMemoryAction(roomId: string, memoryId: string | null, formData: FormData): Promise<DataResult<Saved>> {
  let input: MemoryInput;
  try {
    input = JSON.parse(String(formData.get("input") ?? ""));
  } catch {
    return fail("VALIDATION_ERROR", "The form could not be read. Please try again.");
  }
  const uploads: NewMediaUpload[] = input.media?.added?.flatMap((meta) => {
    const file = formData.get(`${UPLOAD_FIELD_PREFIX}${meta.client_id}`);
    return file instanceof File ? [{ ...meta, file }] : [];
  }) ?? [];

  const result = memoryId ? await updateMemory(roomId, memoryId, input, uploads) : await createMemory(roomId, input, uploads);
  if (!result.ok) return result;

  revalidatePath(`/rooms/${roomId}`, "layout");
  return { ok: true, data: { id: result.data.id, room_id: result.data.room_id } };
}

export async function deleteMemoryAction(roomId: string, memoryId: string): Promise<DataResult<{ id: string }>> {
  const result = await deleteMemory(roomId, memoryId);
  if (result.ok) revalidatePath(`/rooms/${roomId}`, "layout");
  return result;
}
