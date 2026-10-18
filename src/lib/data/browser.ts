"use client";

import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { blockIfDemo, demoBlockedResult } from "@/lib/demo/client";

import { dataMode } from "./config";
import { MockDataSource } from "./mock-source";
import { SupabaseDataSource } from "./supabase-source";

/**
 * Data source for Client Components. Photos are uploaded straight from the browser to the private bucket with the
 * user's own session, so the files never pass through a Server Action body limit; RLS still decides what is allowed.
 */
export function createBrowserDataSource(): DearDaysDataSource {
  if (dataMode() === "mock") return new MockDataSource();
  return withDemoGuard(new SupabaseDataSource(createSupabaseBrowserClient()));
}

/** Everything that writes. The shared demo account is view-only: these calls show the alert and never reach the database. */
const WRITE_METHODS = new Set<string>([
  "updateProfile",
  "createRoom",
  "updateRoom",
  "deleteRoom",
  "joinRoom",
  "removeRoomMember",
  "sendFriendRequest",
  "respondFriendRequest",
  "removeFriend",
  "createMemory",
  "updateMemory",
  "deleteMemory",
  "setFrameLayout",
  "setMemoryFavorite",
  "upsertTags",
] satisfies (keyof DearDaysDataSource)[]);

function withDemoGuard(source: DearDaysDataSource): DearDaysDataSource {
  return new Proxy(source, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || !WRITE_METHODS.has(property) || typeof value !== "function") return value;
      return async (...args: unknown[]) => ((await blockIfDemo()) ? demoBlockedResult() : value.apply(target, args));
    },
  });
}
