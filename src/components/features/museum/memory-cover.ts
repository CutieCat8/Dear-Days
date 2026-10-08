import type { Memory } from "@/lib/contracts/types";

export type MemoryCover = { url: string; alt: string };

/**
 * Single cover/media resolver: the 3D frame texture, the selected-memory panel and any other view use this,
 * so they always load the same URL for the same memory.
 */
export function resolveMemoryCover(memory: Memory): MemoryCover | null {
  const item = memory.media.find((media) => media.id === memory.cover_media_id) ?? memory.media[0];
  if (!item?.signed_url) return null;
  return { url: item.signed_url, alt: item.alt_text || memory.title };
}
