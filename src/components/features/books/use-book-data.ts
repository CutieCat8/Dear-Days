"use client";

import { useCallback, useEffect, useState } from "react";

import type { Memory } from "@/lib/contracts/types";
import { createBrowserDataSource } from "@/lib/data/browser";
import { monthRange, yearRange, type YearMonth } from "@/lib/books/period";
import { listAllMemories } from "@/lib/books/range";

export type BookSpec =
  | { kind: "monthly"; period: YearMonth }
  | { kind: "yearbook"; year: number }
  /** `stamp` changes when a star was added elsewhere, so the book is read again; it stays put while it is being read. */
  | { kind: "highlights"; stamp: number };

export type BookData =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; memories: Memory[] };

/** Photo links are signed for an hour; a book held longer than this is read again rather than shown with dead links. */
const CACHE_MS = 30 * 60 * 1000;

type Entry = { memories: Memory[]; fetchedAt: number };
type Settled = { key: string; memories: Memory[] } | { key: string; error: string };

function specKey(roomId: string, spec: BookSpec): string {
  if (spec.kind === "monthly") return `${roomId}|monthly|${spec.period.year}-${spec.period.month}`;
  if (spec.kind === "yearbook") return `${roomId}|yearbook|${spec.year}`;
  return `${roomId}|highlights|${spec.stamp}`;
}

/**
 * Loads every memory a book needs (all pages of the period, or all of the person's favourites) through the typed data source.
 * An answer is used only if it is for the book that is on screen now: switching room, book or month quickly never shows
 * data left over from an earlier request. A failed read is reported, never replaced by other data.
 * Books already read are kept for the life of the reader (so flicking between months is instant) until their links age out.
 */
export function useBookData(roomId: string, spec: BookSpec): BookData {
  const key = specKey(roomId, spec);
  const kind = spec.kind;
  const year = spec.kind === "monthly" ? spec.period.year : spec.kind === "yearbook" ? spec.year : 0;
  const month = spec.kind === "monthly" ? spec.period.month : 0;
  const [cache] = useState(() => new Map<string, Entry>());
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.fetchedAt < CACHE_MS) {
        await Promise.resolve();
        if (!cancelled) setSettled({ key, memories: hit.memories });
        return;
      }
      const source = createBrowserDataSource();
      const result =
        kind === "highlights"
          ? await source.listFavoriteMemories(roomId)
          : await listAllMemories(source, { room_id: roomId, ...(kind === "monthly" ? monthRange({ year, month }) : yearRange(year)) });
      if (cancelled) return;
      if (result.ok) {
        cache.set(key, { memories: result.data, fetchedAt: Date.now() });
        setSettled({ key, memories: result.data });
      } else {
        setSettled({ key, error: result.error.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cache, key, kind, year, month, roomId, attempt]);

  const retry = useCallback(() => {
    cache.delete(key);
    setSettled(null);
    setAttempt((value) => value + 1);
  }, [cache, key]);

  if (!settled || settled.key !== key) return { status: "loading" };
  if ("error" in settled) return { status: "error", message: settled.error, retry };
  return { status: "ready", memories: settled.memories };
}
