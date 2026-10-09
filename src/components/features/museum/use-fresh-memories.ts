"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Memory } from "@/lib/contracts/types";
import { dataMode } from "@/lib/data/config";
import { SIGNED_URL_SECONDS, SupabaseDataSource } from "@/lib/data/supabase-source";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Refresh when a URL has this much life left (or less). */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;
const LIFETIME_MS = SIGNED_URL_SECONDS * 1000;
const NO_URLS: ReadonlyMap<string, string> = new Map();

/**
 * Keeps the signed photo URLs of an open room valid: renews them before they expire and when the tab becomes
 * visible again. Only the URL strings change, so the scene is not remounted and the camera is not reset.
 * Refreshed URLs belong to the exact `memories` array they were requested for: when the server hands over new data
 * (another room, or a re-render) every fetched URL is dropped, and a late answer for old data is ignored.
 */
export function useFreshMemories(memories: Memory[]): Memory[] {
  const [fetched, setFetched] = useState<{ source: Memory[]; urls: ReadonlyMap<string, string> }>({ source: memories, urls: NO_URLS });
  const urls = fetched.source === memories ? fetched.urls : NO_URLS;

  const issuedAt = useRef(0);
  const latest = useRef(memories);

  useEffect(() => {
    if (dataMode() === "mock") return;
    latest.current = memories;
    issuedAt.current = Date.now(); // the server rendered these URLs just now
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      const forMemories = memories;
      const paths = [...new Set(forMemories.flatMap((memory) => memory.media.map((item) => item.storage_path)))];
      if (paths.length === 0) return;
      try {
        const next = await new SupabaseDataSource(createSupabaseBrowserClient()).refreshMediaUrls(paths);
        if (cancelled || latest.current !== forMemories || next.size === 0) return;
        issuedAt.current = Date.now();
        setFetched({ source: forMemories, urls: next });
      } catch {
        // keep the current URLs; the next check tries again
      }
    }

    const due = () => Date.now() - issuedAt.current >= LIFETIME_MS - REFRESH_MARGIN_MS;

    function schedule() {
      timer = setTimeout(async () => {
        if (due()) await refresh();
        if (!cancelled) schedule();
      }, Math.max(30_000, LIFETIME_MS - REFRESH_MARGIN_MS - (Date.now() - issuedAt.current)));
    }

    function onVisible() {
      if (document.visibilityState === "visible" && due()) void refresh();
    }

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [memories]);

  return useMemo(
    () => (urls.size === 0 ? memories : memories.map((memory) => ({ ...memory, media: memory.media.map((item) => ({ ...item, signed_url: urls.get(item.storage_path) ?? item.signed_url })) }))),
    [memories, urls],
  );
}
