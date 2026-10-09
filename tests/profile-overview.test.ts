import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mockCurrentProfile, mockMemories } from "../src/lib/contracts/fixtures";
import { MockDataSource } from "../src/lib/data/mock-source";
import { loadProfileOverview, moodWindow, parseMoodRange } from "../src/lib/data/profile-overview";

const TODAY = new Date(2026, 9, 10); // 10 Oct 2026, local time

describe("profile overview", () => {
  it("parses the range and falls back to 3 months", () => {
    assert.equal(parseMoodRange("12"), 12);
    assert.equal(parseMoodRange(["6", "1"]), 6);
    for (const value of [undefined, "", "2", "abc", "-1"]) assert.equal(parseMoodRange(value), 3);
  });

  it("builds an inclusive window that ends today", () => {
    assert.deepEqual(moodWindow(3, TODAY), { from: "2026-07-11", to: "2026-10-10" });
    assert.deepEqual(moodWindow(1, new Date(2026, 2, 31)), { from: "2026-03-01", to: "2026-03-31" });
  });

  it("counts only the viewer's own memories, and only inside the window for moods", async () => {
    const result = await loadProfileOverview(new MockDataSource(), mockCurrentProfile.id, 12, TODAY);
    assert.ok(result.ok);

    const mine = mockMemories.filter((memory) => memory.author_id === mockCurrentProfile.id);
    assert.equal(result.data.memoryCount, mine.length);

    const { from, to } = moodWindow(12, TODAY);
    const inWindow = mine.filter((memory) => memory.memory_date >= from && memory.memory_date <= to);
    const counted = Object.values(result.data.mood.counts).reduce((sum, value) => sum + value, 0) + result.data.mood.withoutMood;
    assert.equal(counted, inWindow.length);
    assert.equal(result.data.mood.counts.happy, inWindow.filter((memory) => memory.mood === "happy").length);
  });
});
