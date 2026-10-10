import type { Memory } from "@/lib/contracts/types";

/**
 * Display slots are fixed positions in the room, NOT memory records.
 * A slot is only rendered when a real memory from the data contract is assigned to it
 * (one memory per slot, matched by memory.id); empty slots stay hidden.
 */
export type SlotMount = "wall-left" | "wall-right" | "shelf" | "desk";

export type FrameSlot = {
  id: string;
  kind: "frame";
  mount: SlotMount;
  /** Wall frames: centre. Standing frames: base point on the surface. */
  position: [number, number, number];
  size: [number, number];
  /** Lower = receives a memory first. */
  priority: number;
  art: number;
};

export type DiarySlot = {
  id: string;
  kind: "diary";
  position: [number, number, number];
  rotationY: number;
  lean: number;
  priority: number;
  color: string;
};

// Inner faces of the two walls (frames sit flush against them).
const X_LEFT = -2.496;
const Z_RIGHT = -3.996;

/**
 * Gallery wall layout, in each wall's own coordinates: `along` is the position along the wall
 * (z on the back-left wall, x on the back-right wall), `row` picks a shared centre line, `size` is [width, height].
 * Frames in a row are centre-aligned on the row line with an even gap, and the rows keep a clear band between them.
 * Row 1 sits 0.3 m under the wall top; row 2 sits above the cabinet/desk items.
 */
const WALL_ROWS = { top: 2.9, bottom: 1.95 } as const;

type WallFrame = { id: string; along: number; row: keyof typeof WALL_ROWS; size: [number, number]; priority: number; art: number };

const LEFT_WALL: WallFrame[] = [
  // row 1: portrait · HERO landscape · landscape · portrait (shared centre line, 0.25 gaps)
  { id: "L1", along: -2.95, row: "top", size: [0.8, 1.0], priority: 4, art: 0 },
  { id: "L2", along: -1.6, row: "top", size: [1.4, 1.0], priority: 0, art: 1 },
  { id: "L3", along: -0.15, row: "top", size: [1.0, 0.8], priority: 2, art: 2 },
  { id: "L4", along: 0.975, row: "top", size: [0.75, 1.0], priority: 5, art: 3 },
  // row 2: three small landscapes, offset against the row above
  { id: "L7", along: -2.25, row: "bottom", size: [1.1, 0.5], priority: 9, art: 5 },
  { id: "L8", along: -0.8, row: "bottom", size: [0.9, 0.5], priority: 10, art: 0 },
  { id: "L5", along: 0.7, row: "bottom", size: [1.0, 0.5], priority: 7, art: 4 },
];

const RIGHT_WALL: WallFrame[] = [
  { id: "R1", along: -1.5, row: "top", size: [0.8, 1.0], priority: 3, art: 3 },
  { id: "R4", along: -0.2, row: "top", size: [1.3, 1.0], priority: 1, art: 4 },
  { id: "R2", along: 1.1, row: "top", size: [0.8, 1.0], priority: 6, art: 2 },
  { id: "R3", along: 0.6, row: "bottom", size: [1.0, 0.5], priority: 11, art: 0 },
  { id: "R5", along: 1.75, row: "bottom", size: [0.8, 0.5], priority: 8, art: 1 },
];

function wallSlots(frames: WallFrame[], mount: "wall-left" | "wall-right"): FrameSlot[] {
  return frames.map(({ id, along, row, size, priority, art }) => ({
    id,
    kind: "frame",
    mount,
    position: mount === "wall-left" ? [X_LEFT, WALL_ROWS[row], along] : [along, WALL_ROWS[row], Z_RIGHT],
    size,
    priority,
    art,
  }));
}

export const FRAME_SLOTS: FrameSlot[] = [
  ...wallSlots(LEFT_WALL, "wall-left"),
  ...wallSlots(RIGHT_WALL, "wall-right"),
  // standing frames (base point on the furniture top)
  { id: "S1", kind: "frame", mount: "shelf", position: [-2.2, 0.85, -3.3], size: [0.5, 0.4], priority: 12, art: 2 },
  { id: "S2", kind: "frame", mount: "shelf", position: [-2.2, 0.85, -0.3], size: [0.46, 0.38], priority: 13, art: 1 },
  { id: "D1", kind: "frame", mount: "desk", position: [0.74, 0.8, -3.5], size: [0.42, 0.36], priority: 14, art: 0 },
];

export const DIARY_SLOTS: DiarySlot[] = [
  { id: "B1", kind: "diary", position: [-2.12, 0.85, -2.6], rotationY: Math.PI / 2 + 0.12, lean: 0.2, priority: 0, color: "#5d7a5e" },
  { id: "B2", kind: "diary", position: [-2.12, 0.85, -1.8], rotationY: Math.PI / 2 - 0.05, lean: 0.22, priority: 1, color: "#e6dcc3" },
  { id: "B3", kind: "diary", position: [-2.12, 0.85, -1.0], rotationY: Math.PI / 2 - 0.2, lean: 0.24, priority: 2, color: "#d8c9a6" },
];

export type SlotAssignment<T extends FrameSlot | DiarySlot> = { slot: T; memory: Memory };

const byPriority = <T extends { priority: number }>(slots: T[]) => [...slots].sort((a, b) => a.priority - b.priority);

/** Frame id → memory id: photos the members pinned to a specific frame. */
export type FramePins = Record<string, string>;

/**
 * Photo memories → frames, text-only memories → diaries. Slots without a memory are dropped.
 * Pinned photos take their chosen frame first; every other frame is filled automatically, in priority order,
 * with the remaining photos in the order given (newest first). A pin that no longer fits (unknown frame, memory
 * gone or without a photo, memory pinned twice) is ignored, so the frame simply falls back to automatic.
 */
export function assignMemories(memories: Memory[], pins: FramePins = {}) {
  const photos = memories.filter((memory) => memory.media.length > 0);
  const notes = memories.filter((memory) => memory.media.length === 0);
  const photoById = new Map(photos.map((memory) => [memory.id, memory]));

  const slots = byPriority(FRAME_SLOTS);
  const pinned = new Map<string, Memory>();
  const used = new Set<string>();
  for (const slot of slots) {
    const memory = photoById.get(pins[slot.id]);
    if (memory && !used.has(memory.id)) {
      pinned.set(slot.id, memory);
      used.add(memory.id);
    }
  }

  const rest = photos.filter((memory) => !used.has(memory.id));
  const frames: SlotAssignment<FrameSlot>[] = [];
  for (const slot of slots) {
    const memory = pinned.get(slot.id) ?? rest.shift();
    if (memory) frames.push({ slot, memory });
  }
  const diaries: SlotAssignment<DiarySlot>[] = [];
  byPriority(DIARY_SLOTS).forEach((slot, index) => {
    if (notes[index]) diaries.push({ slot, memory: notes[index] });
  });
  return { frames, diaries };
}

/** Memories that actually have an object in the room, in a stable order (used for previous/next). */
export function visibleMemories(memories: Memory[], pins: FramePins = {}) {
  const { frames, diaries } = assignMemories(memories, pins);
  return [...frames.map((item) => item.memory), ...diaries.map((item) => item.memory)];
}

/** What hangs where right now (pinned or automatic), as pins. Saving this keeps every frame exactly as it looks. */
export function displayedPins(frames: SlotAssignment<FrameSlot>[]): FramePins {
  return Object.fromEntries(frames.map(({ slot, memory }) => [slot.id, memory.id]));
}

/**
 * Hangs `memoryId` in frame `slotId`. If that photo hung in another frame, the two frames swap
 * (or the other frame is left to the automatic layout when this frame was empty).
 */
export function placeInFrame(current: FramePins, slotId: string, memoryId: string): FramePins {
  const next = { ...current };
  const from = Object.keys(next).find((id) => next[id] === memoryId && id !== slotId);
  const previous = next[slotId];
  if (from) {
    if (previous) next[from] = previous;
    else delete next[from];
  }
  next[slotId] = memoryId;
  return next;
}
