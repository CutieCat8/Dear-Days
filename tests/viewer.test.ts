import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getMyAccount, type Account } from "../src/lib/data/profile";
import { fail, ok } from "../src/lib/data/result";
import { viewerFromResult } from "../src/lib/data/viewer";
import type { Database } from "../src/lib/supabase/database.types";

const ACCOUNT: Account = {
  id: "20000000-0000-4000-8000-000000000001",
  display_name: "Sea",
  avatar_url: null,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  email: "sea@example.com",
  bio: null,
  username: "sea",
};

describe("viewerFromResult: a failed query is not a signed-out visitor", () => {
  it("returns the account when it loaded", () => {
    assert.equal(viewerFromResult(ok(ACCOUNT)), ACCOUNT);
  });

  it("returns null only when there is no session", () => {
    assert.equal(viewerFromResult(fail("UNAUTHENTICATED", "Please sign in to continue.")), null);
  });

  it("throws for every other failure, so a page never redirects a signed-in person to /sign-in (and the proxy back to Home)", () => {
    for (const code of ["INTERNAL_ERROR", "NOT_FOUND", "FORBIDDEN", "VALIDATION_ERROR", "CONFLICT"] as const) {
      assert.throws(() => viewerFromResult(fail(code, "boom")), /Could not load your account/, code);
    }
  });
});

type Reply = { data: unknown; error: { code: string; message: string } | null };

/** A client with a valid session whose `profiles` queries answer from `replies`, in order, recording the select string. */
function fakeClient(replies: Reply[]) {
  const selects: string[] = [];
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: ACCOUNT.id, email: ACCOUNT.email } }, error: null }) },
    from: () => ({
      select: (columns: string) => {
        selects.push(columns);
        const reply = replies.shift() ?? { data: null, error: { code: "XX000", message: "no reply left" } };
        return { eq: () => ({ maybeSingle: async () => reply }) };
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, selects };
}

const row = { user_id: ACCOUNT.id, display_name: "Sea", avatar_url: null, bio: null, created_at: ACCOUNT.created_at, updated_at: ACCOUNT.updated_at };

describe("getMyAccount", () => {
  it("selects username and returns it when the column exists", async () => {
    const { client, selects } = fakeClient([{ data: { ...row, username: "sea" }, error: null }]);
    const result = await getMyAccount(client);
    assert.ok(result.ok && result.data.username === "sea");
    assert.equal(selects.length, 1);
    assert.match(selects[0], /username/);
  });

  it("loads the profile without username when only that column is missing (migration 0400 not applied yet)", async () => {
    const { client, selects } = fakeClient([
      { data: null, error: { code: "42703", message: "column profiles.username does not exist" } },
      { data: row, error: null },
    ]);
    const result = await getMyAccount(client);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.data.username, null);
    assert.equal(result.data.display_name, "Sea");
    assert.equal(selects.length, 2);
    assert.doesNotMatch(selects[1], /username/);
  });

  it("does not retry or hide other failures", async () => {
    const other = fakeClient([{ data: null, error: { code: "42501", message: "permission denied for table profiles" } }]);
    const denied = await getMyAccount(other.client);
    assert.ok(!denied.ok && denied.error.code === "FORBIDDEN");
    assert.equal(other.selects.length, 1, "no retry for a permission error");

    const otherColumn = fakeClient([{ data: null, error: { code: "42703", message: "column profiles.bio does not exist" } }]);
    const broken = await getMyAccount(otherColumn.client);
    assert.ok(!broken.ok && broken.error.code === "INTERNAL_ERROR");
    assert.equal(otherColumn.selects.length, 1, "only a missing username column is tolerated");

    const stillMissing = fakeClient([
      { data: null, error: { code: "42703", message: "column profiles.username does not exist" } },
      { data: null, error: { code: "XX000", message: "database unavailable" } },
    ]);
    const failed = await getMyAccount(stillMissing.client);
    assert.ok(!failed.ok, "a failing retry is reported, not turned into a profile");
  });

  it("reports a missing profile row as NOT_FOUND and no session as UNAUTHENTICATED", async () => {
    const empty = fakeClient([{ data: null, error: null }]);
    const missing = await getMyAccount(empty.client);
    assert.ok(!missing.ok && missing.error.code === "NOT_FOUND");

    const signedOut = {
      auth: { getClaims: async () => ({ data: null, error: { message: "no session" } }) },
      from: () => {
        throw new Error("must not query without a session");
      },
    } as unknown as SupabaseClient<Database>;
    const none = await getMyAccount(signedOut);
    assert.ok(!none.ok && none.error.code === "UNAUTHENTICATED");
  });
});
