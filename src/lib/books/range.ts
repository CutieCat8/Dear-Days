import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import type { DataResult, Memory } from "@/lib/contracts/types";

const PAGE_SIZE = 50; // the contract's maximum
/** A hard stop so a misbehaving source can never loop forever (10 000 memories in one period). */
const MAX_PAGES = 200;

/**
 * Every memory of a room inside a date range, read page after page until the source says there is no more.
 * The books and their statistics must never be built from only the first page of a list.
 */
export async function listAllMemories(
  source: DearDaysDataSource,
  params: { room_id: string; date_from?: string; date_to?: string },
): Promise<DataResult<Memory[]>> {
  const memories: Memory[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await source.listMemories({ ...params, page, page_size: PAGE_SIZE, sort: "memory_date_asc" });
    if (!result.ok) return result;
    for (const memory of result.data.items) {
      if (seen.has(memory.id)) continue; // a memory added while reading can shift a page: never show it twice
      seen.add(memory.id);
      memories.push(memory);
    }
    if (!result.data.has_more || result.data.items.length === 0) return { ok: true, data: memories };
  }
  return { ok: false, error: { code: "INTERNAL_ERROR", message: "This period has more memories than a book can hold." } };
}
