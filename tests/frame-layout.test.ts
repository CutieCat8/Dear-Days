import assert from "node:assert/strict";
import { test } from "node:test";

import { mockMemories } from "../src/lib/contracts/fixtures";
import { assignMemories, displayedPins, FRAME_SLOTS, placeInFrame } from "../src/components/features/museum/room-3d/slots";
import type { Memory } from "../src/lib/contracts/types";

const photo = (id: string): Memory => ({ ...mockMemories[0], id, media: [{ ...mockMemories[0].media[0], id: `${id}-m` }] });
const memories = Array.from({ length: 20 }, (_, index) => photo(`p${index}`));
const byPriority = [...FRAME_SLOTS].sort((a, b) => a.priority - b.priority);

test("without pins photos fill frames in priority order, newest first", () => {
  const { frames } = assignMemories(memories);
  assert.equal(frames.length, FRAME_SLOTS.length);
  assert.equal(frames[0].slot.id, byPriority[0].id);
  assert.equal(frames[0].memory.id, "p0");
});

test("a pinned photo takes its frame and is not repeated in another", () => {
  const target = byPriority[5].id;
  const { frames } = assignMemories(memories, { [target]: "p19" });
  assert.equal(frames.find((item) => item.slot.id === target)?.memory.id, "p19");
  assert.equal(frames.filter((item) => item.memory.id === "p19").length, 1);
  assert.equal(new Set(frames.map((item) => item.memory.id)).size, frames.length);
});

test("pins that no longer fit fall back to automatic", () => {
  const { frames } = assignMemories(memories, { nope: "p3", [byPriority[0].id]: "gone" });
  assert.equal(frames[0].memory.id, "p0");
});

test("a text-only memory cannot be pinned to a frame", () => {
  const note: Memory = { ...mockMemories[0], id: "note", media: [] };
  const { frames } = assignMemories([note, ...memories], { [byPriority[0].id]: "note" });
  assert.ok(frames.every((item) => item.memory.id !== "note"));
});

test("displayedPins freezes the current look and placeInFrame swaps two frames", () => {
  const shown = displayedPins(assignMemories(memories).frames);
  const [a, b] = [byPriority[0].id, byPriority[1].id];
  const swapped = placeInFrame(shown, a, shown[b]);
  assert.equal(swapped[a], shown[b]);
  assert.equal(swapped[b], shown[a]);
  assert.equal(Object.keys(swapped).length, Object.keys(shown).length);
  // saving the frozen layout changes nothing on screen
  assert.deepEqual(displayedPins(assignMemories(memories, shown).frames), shown);
});

test("placing a hidden photo replaces only that frame", () => {
  const shown = displayedPins(assignMemories(memories).frames);
  const slot = byPriority[2].id;
  const next = placeInFrame(shown, slot, "p19");
  assert.equal(next[slot], "p19");
  assert.deepEqual({ ...next, [slot]: shown[slot] }, shown);
});
