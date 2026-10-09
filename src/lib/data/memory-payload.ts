import { MEDIA_CONSTRAINTS } from "@/lib/contracts/constants";
import type { MemoryInput, NewMediaUpload } from "@/lib/contracts/types";

export const MEMORY_BUCKET = "memory-media";

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type PlannedUpload = {
  /** id of the memory_media row that will be created */
  id: string;
  client_id: string;
  path: string;
  contentType: string;
  file: File;
};

export type SavePlan = {
  /** argument for the save_memory RPC */
  payload: Record<string, unknown>;
  uploads: PlannedUpload[];
};

/** Storage path convention shared with the SQL policies: {room_id}/{uploader_id}/{memory_id}/{media_id}.{ext} */
export function storagePath(roomId: string, userId: string, memoryId: string, mediaId: string, mime: string) {
  return `${roomId}/${userId}/${memoryId}/${mediaId}.${EXTENSIONS[mime] ?? "bin"}`;
}

/**
 * Turns a validated MemoryInput + the real files into (1) the RPC payload and (2) the list of Storage uploads.
 * Returns an error string when the files do not match the declared metadata (so nothing is uploaded).
 * `newId` is injectable for tests.
 */
export function planMemorySave(
  roomId: string,
  userId: string,
  memoryId: string,
  input: MemoryInput,
  files: NewMediaUpload[],
  newId: () => string = () => crypto.randomUUID(),
): SavePlan | { error: string } {
  const byClient = new Map(files.map((item) => [item.client_id, item]));
  if (byClient.size !== files.length) return { error: "Each photo must be sent once." };
  if (input.media.added.length !== files.length) return { error: "The photos sent do not match the photos listed." };

  const uploads: PlannedUpload[] = [];
  const added = [];
  for (const meta of input.media.added) {
    const upload = byClient.get(meta.client_id);
    if (!upload || !upload.file) return { error: "A listed photo is missing its file." };
    if (upload.file.size !== meta.size_bytes || upload.file.type !== meta.mime_type || upload.mime_type !== meta.mime_type) {
      return { error: "A photo does not match its description." };
    }
    if (!(MEDIA_CONSTRAINTS.acceptedMimeTypes as readonly string[]).includes(upload.file.type)) return { error: "Only JPEG, PNG and WebP photos are supported." };
    if (upload.file.size > MEDIA_CONSTRAINTS.maxFileBytes) return { error: "Each photo must be 10 MB or smaller." };

    const id = newId();
    const path = storagePath(roomId, userId, memoryId, id, meta.mime_type);
    uploads.push({ id, client_id: meta.client_id, path, contentType: meta.mime_type, file: upload.file });
    added.push({ client_id: meta.client_id, id, storage_path: path, mime_type: meta.mime_type, size_bytes: meta.size_bytes, alt_text: meta.alt_text });
  }

  return {
    uploads,
    payload: {
      title: input.title,
      body: input.body,
      memory_date: input.memory_date,
      mood: input.mood,
      period_label: input.period_label,
      tags: input.tags,
      media: {
        existing: input.media.existing,
        added,
        removed_media_ids: input.media.removed_media_ids,
        order: input.media.order,
        cover: input.media.cover,
      },
    },
  };
}
