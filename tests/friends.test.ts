import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { usernameSchema } from "../src/lib/contracts/schemas";
import { friendsOverviewFromRows, type FriendProfileRow, type FriendshipRow } from "../src/lib/data/friends";

const ME = "20000000-0000-4000-8000-000000000001";
const MINT = "20000000-0000-4000-8000-000000000002";
const PLOY = "20000000-0000-4000-8000-000000000003";
const JAMES = "20000000-0000-4000-8000-000000000004";
const HIDDEN = "20000000-0000-4000-8000-000000000005";

const profiles: FriendProfileRow[] = [
  { user_id: MINT, display_name: "Mint", username: "mint.days", avatar_url: null },
  { user_id: PLOY, display_name: "Ploy", username: "ploy.memories", avatar_url: null },
  { user_id: JAMES, display_name: "James", username: "james.diary", avatar_url: null },
];

function row(id: string, requester: string, addressee: string, status: "pending" | "accepted", created = "2026-10-01T00:00:00.000Z"): FriendshipRow {
  return { id, requester_id: requester, addressee_id: addressee, status, created_at: created, responded_at: status === "accepted" ? "2026-10-02T00:00:00.000Z" : null };
}

describe("usernameSchema", () => {
  it("normalises spaces, a leading @ and case", () => {
    assert.equal(usernameSchema.parse("  @Mint.Days "), "mint.days");
    assert.equal(usernameSchema.parse("sea_2026"), "sea_2026");
  });

  it("rejects bad handles", () => {
    for (const value of ["", "ab", ".mint", "mint.", "has space", "thai-ชื่อ", "x".repeat(31)]) {
      assert.equal(usernameSchema.safeParse(value).success, false, value);
    }
  });
});

describe("friendsOverviewFromRows", () => {
  const rows = [
    row("f1", MINT, ME, "accepted"),
    row("f2", ME, JAMES, "accepted"),
    row("f3", PLOY, ME, "pending", "2026-10-08T00:00:00.000Z"),
    row("f4", ME, HIDDEN, "pending"),
  ];

  it("splits friends, incoming and outgoing from the viewer's side", () => {
    const overview = friendsOverviewFromRows(ME, rows, profiles);
    assert.deepEqual(overview.friends.map((friend) => friend.display_name), ["James", "Mint"]);
    assert.equal(overview.friends[1].since, "2026-10-02T00:00:00.000Z");
    assert.deepEqual(overview.incoming.map((request) => [request.username, request.direction]), [["ploy.memories", "incoming"]]);
    assert.equal(overview.incoming[0].friendship_id, "f3");
  });

  it("skips rows whose profile is not visible", () => {
    const overview = friendsOverviewFromRows(ME, rows, profiles);
    assert.equal(overview.outgoing.length, 0);
  });

  it("reads the same rows from the other person's side", () => {
    const overview = friendsOverviewFromRows(PLOY, [row("f3", PLOY, ME, "pending")], [{ user_id: ME, display_name: "Sea", username: "sea", avatar_url: null }]);
    assert.deepEqual(overview.outgoing.map((request) => request.display_name), ["Sea"]);
    assert.equal(overview.incoming.length, 0);
  });
});
