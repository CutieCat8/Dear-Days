import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mockFavoriteMemoryIds, mockMemories } from "../src/lib/contracts/fixtures";
import { MockDataSource } from "../src/lib/data/mock-source";
import { SupabaseDataSource } from "../src/lib/data/supabase-source";
import type { Database } from "../src/lib/supabase/database.types";

const ROOM = mockMemories[0].room_id;
const USER = "20000000-0000-4000-8000-000000000001";

type Call = { table: string; filters: [string, unknown][]; range?: [number, number]; inIds?: string[] };

/**
 * A stand-in Supabase client: records every query and answers from `rows`. `favoriteRows` is the whole favourites table
 * for this user (the fake pages it like PostgREST does), `memoryRows` the memories table.
 */
function fakeClient(options: { favoriteRows?: { memory_id: string }[]; memoryRows?: unknown[]; failOn?: string; signedIn?: boolean }) {
  const calls: Call[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  const client = {
    auth: { getClaims: async () => (options.signedIn === false ? { data: null, error: { message: "no session" } } : { data: { claims: { sub: USER } }, error: null }) },
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return options.failOn === fn ? { data: null, error: { message: "FORBIDDEN" } } : { data: null, error: null };
    },
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const answer = () => {
        if (options.failOn === table) return { data: null, error: { message: "boom", code: "XX000" } };
        if (table === "memory_favorites") {
          const all = options.favoriteRows ?? [];
          const [from, to] = call.range ?? [0, all.length];
          return { data: all.slice(from, to + 1), error: null };
        }
        const rows = (options.memoryRows ?? []) as { id: string }[];
        return { data: rows.filter((row) => !call.inIds || call.inIds.includes(row.id)), error: null };
      };
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return chain;
        },
        in: (_column: string, ids: string[]) => {
          call.inIds = ids;
          return chain;
        },
        order: () => chain,
        range: (from: number, to: number) => {
          call.range = [from, to];
          return Promise.resolve(answer());
        },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(answer()).then(resolve),
      };
      return chain;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls, rpcCalls };
}

describe("favorites in the Supabase data source", () => {
  it("asks only for the signed-in person's own stars in this room", async () => {
    const { client, calls } = fakeClient({ favoriteRows: [{ memory_id: "a" }, { memory_id: "b" }] });
    const result = await new SupabaseDataSource(client).listFavoriteMemoryIds(ROOM);
    assert.ok(result.ok);
    assert.deepEqual(result.data, ["a", "b"]);
    assert.deepEqual(calls[0].filters, [["room_id", ROOM], ["user_id", USER]]);
  });

  it("reads every page of favourites, not just the first", async () => {
    const favoriteRows = Array.from({ length: 1234 }, (_, i) => ({ memory_id: `m${i}` }));
    const { client, calls } = fakeClient({ favoriteRows });
    const result = await new SupabaseDataSource(client).listFavoriteMemoryIds(ROOM);
    assert.ok(result.ok);
    assert.equal(result.data.length, 1234);
    assert.equal(calls.length, 3);
  });

  it("returns an error, never an empty list, when the read fails", async () => {
    const { client } = fakeClient({ failOn: "memory_favorites" });
    const result = await new SupabaseDataSource(client).listFavoriteMemoryIds(ROOM);
    assert.equal(result.ok, false);
  });

  it("needs a session", async () => {
    const { client, calls } = fakeClient({ signedIn: false });
    const source = new SupabaseDataSource(client);
    const result = await source.listFavoriteMemoryIds(ROOM);
    assert.ok(!result.ok && result.error.code === "UNAUTHENTICATED");
    const star = await source.setMemoryFavorite(ROOM, "m", true);
    assert.ok(!star.ok && star.error.code === "UNAUTHENTICATED");
    assert.equal(calls.length, 0);
  });

  it("loads the favourite memories in chunks, only of this room, oldest first", async () => {
    const favoriteRows = Array.from({ length: 150 }, (_, i) => ({ memory_id: `40000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}` }));
    const memoryRows = favoriteRows.map((row, i) => ({
      id: row.memory_id,
      room_id: ROOM,
      author_id: USER,
      title: `Memory ${i}`,
      body: "text",
      memory_date: `2026-0${(i % 9) + 1}-10`,
      mood: null,
      period_label: null,
      cover_media_id: null,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
      memory_media: [],
      memory_tags: [],
    }));
    const { client, calls } = fakeClient({ favoriteRows, memoryRows });
    const result = await new SupabaseDataSource(client).listFavoriteMemories(ROOM);
    assert.ok(result.ok);
    assert.equal(result.data.length, 150);
    const memoryQueries = calls.filter((call) => call.table === "memories");
    assert.equal(memoryQueries.length, 2, "150 ids are read in two chunks of at most 100");
    assert.ok(memoryQueries.every((call) => call.filters.some(([column, value]) => column === "room_id" && value === ROOM)));
    const dates = result.data.map((memory) => memory.memory_date);
    assert.deepEqual(dates, [...dates].sort());
  });

  it("stars and un-stars through the RPC, and reports the database's refusal", async () => {
    const ok = fakeClient({});
    const source = new SupabaseDataSource(ok.client);
    const starred = await source.setMemoryFavorite(ROOM, "m1", true);
    assert.ok(starred.ok && starred.data.favorite === true);
    await source.setMemoryFavorite(ROOM, "m1", false);
    assert.deepEqual(ok.rpcCalls.map((call) => call.args), [
      { p_room_id: ROOM, p_memory_id: "m1", p_favorite: true },
      { p_room_id: ROOM, p_memory_id: "m1", p_favorite: false },
    ]);

    const refused = fakeClient({ failOn: "set_memory_favorite" });
    const result = await new SupabaseDataSource(refused.client).setMemoryFavorite(ROOM, "m1", true);
    assert.ok(!result.ok && result.error.code === "FORBIDDEN");
  });
});

describe("favorites in demo mode", () => {
  it("shows the demo person's highlights and refuses to change them", async () => {
    const source = new MockDataSource();
    const ids = await source.listFavoriteMemoryIds(ROOM);
    assert.ok(ids.ok);
    assert.deepEqual([...ids.data].sort(), [...mockFavoriteMemoryIds].sort());
    const memories = await source.listFavoriteMemories(ROOM);
    assert.ok(memories.ok);
    assert.equal(memories.data.length, mockFavoriteMemoryIds.length);
    assert.deepEqual(memories.data.map((memory) => memory.memory_date), memories.data.map((memory) => memory.memory_date).sort());
    const change = await source.setMemoryFavorite();
    assert.equal(change.ok, false);
  });

  it("another room has none", async () => {
    const result = await new MockDataSource().listFavoriteMemories("10000000-0000-4000-8000-000000000002");
    assert.ok(result.ok);
    assert.deepEqual(result.data, []);
  });
});
