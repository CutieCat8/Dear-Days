import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSessionUser } from "../src/lib/data/session";
import type { Database } from "../src/lib/supabase/database.types";

type Claims = { sub?: string; email?: unknown } | null;

/** A client whose getClaims answers from `state.claims` after `delayMs`, counting calls. */
function fakeClient(state: { claims: Claims; delayMs?: number; fail?: boolean }) {
  const counter = { calls: 0 };
  const client = {
    auth: {
      getClaims: async () => {
        counter.calls += 1;
        await new Promise((resolve) => setTimeout(resolve, state.delayMs ?? 0));
        if (state.fail) throw new Error("network down");
        return state.claims ? { data: { claims: state.claims }, error: null } : { data: null, error: { message: "no session" } };
      },
    },
  } as unknown as SupabaseClient<Database>;
  return { client, counter };
}

describe("getSessionUser", () => {
  it("returns the id and e-mail from the verified claims, and null without a session", async () => {
    const signedIn = fakeClient({ claims: { sub: "user-a", email: "a@example.com" } });
    assert.deepEqual(await getSessionUser(signedIn.client), { id: "user-a", email: "a@example.com" });
    const signedOut = fakeClient({ claims: null });
    assert.equal(await getSessionUser(signedOut.client), null);
    const noSubject = fakeClient({ claims: { email: "x@example.com" } });
    assert.equal(await getSessionUser(noSubject.client), null, "claims without a subject are not a session");
  });

  it("treats an e-mail that is not a string as missing and a failing check as signed out", async () => {
    const odd = fakeClient({ claims: { sub: "user-a", email: 42 } });
    assert.deepEqual(await getSessionUser(odd.client), { id: "user-a", email: null });
    const failing = fakeClient({ claims: { sub: "user-a" }, fail: true });
    assert.equal(await getSessionUser(failing.client), null);
  });

  it("lets overlapping calls on one client share a single check", async () => {
    const { client, counter } = fakeClient({ claims: { sub: "user-a" }, delayMs: 20 });
    const results = await Promise.all([getSessionUser(client), getSessionUser(client), getSessionUser(client)]);
    assert.equal(counter.calls, 1);
    assert.ok(results.every((user) => user?.id === "user-a"));
  });

  it("never shares an answer between clients, even at the same moment", async () => {
    const a = fakeClient({ claims: { sub: "user-a" }, delayMs: 10 });
    const b = fakeClient({ claims: { sub: "user-b" }, delayMs: 5 });
    const c = fakeClient({ claims: null, delayMs: 1 });
    const [ua, ub, uc] = await Promise.all([getSessionUser(a.client), getSessionUser(b.client), getSessionUser(c.client)]);
    assert.equal(ua?.id, "user-a");
    assert.equal(ub?.id, "user-b");
    assert.equal(uc, null);
  });

  it("keeps nothing after a check finishes: sign-out and switching account are seen on the next call", async () => {
    const state: { claims: Claims } = { claims: { sub: "user-a" } };
    const { client, counter } = fakeClient(state);
    assert.equal((await getSessionUser(client))?.id, "user-a");
    state.claims = null; // signed out
    assert.equal(await getSessionUser(client), null);
    state.claims = { sub: "user-b" }; // another account on the same client
    assert.equal((await getSessionUser(client))?.id, "user-b");
    assert.equal(counter.calls, 3, "each sequential call checks again");
  });
});
