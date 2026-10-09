import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeNextPath } from "../src/lib/auth/paths";

describe("safeNextPath", () => {
  it("keeps same-site paths with query and hash", () => {
    assert.equal(safeNextPath("/rooms/join?code=AB12CD34"), "/rooms/join?code=AB12CD34");
    assert.equal(safeNextPath("/profile#top"), "/profile#top");
    assert.equal(safeNextPath(["/rooms", "/profile"]), "/rooms");
  });

  it("falls back to / for missing or non-path values", () => {
    for (const value of [undefined, null, "", "rooms", "https://evil.example", "javascript:alert(1)"]) {
      assert.equal(safeNextPath(value), "/");
    }
  });

  it("refuses values that leave the site", () => {
    // `/\evil.example` passed the old startsWith check but new URL() resolves it to http://evil.example/
    for (const value of ["//evil.example", "/\\evil.example", "/\\/evil.example", "/%5Cevil.example".replace("%5C", "\\")]) {
      assert.equal(safeNextPath(value), "/", value);
    }
  });

  it("never sends sign-in back to an auth page", () => {
    assert.equal(safeNextPath("/sign-in?next=/rooms"), "/");
    assert.equal(safeNextPath("/sign-up"), "/");
  });
});
