"use client";

import type { DearDaysDataSource } from "@/lib/contracts/data-functions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { dataMode } from "./config";
import { MockDataSource } from "./mock-source";
import { SupabaseDataSource } from "./supabase-source";

/**
 * Data source for Client Components. Photos are uploaded straight from the browser to the private bucket with the
 * user's own session, so the files never pass through a Server Action body limit; RLS still decides what is allowed.
 */
export function createBrowserDataSource(): DearDaysDataSource {
  if (dataMode() === "mock") return new MockDataSource();
  return new SupabaseDataSource(createSupabaseBrowserClient());
}
