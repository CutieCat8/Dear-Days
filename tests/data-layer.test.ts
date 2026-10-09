import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memoryInputSchema, roomInputSchema } from "../src/lib/contracts/schemas";
import { memoryFromRow } from "../src/lib/data/mappers";
import { planMemorySave, storagePath } from "../src/lib/data/memory-payload";
import { mapDatabaseError } from "../src/lib/data/result";
import { localDateString } from "../src/lib/local-date";

const ROOM = "10000000-0000-4000-8000-000000000001";
const USER = "20000000-0000-4000-8000-000000000001";
const MEMORY = "40000000-0000-4000-8000-000000000001";
const CLIENT = "50000000-0000-4000-8000-000000000001";

function file(size: number, type: string) {
  return new File([new Uint8Array(size)], "photo.jpg", { type });
}

function baseInput() {
  return {
    title: "Day",
    body: "Body",
    memory_date: "2026-10-01",
    mood: null,
    period_label: null,
    tags: [{ type: "person" as const, label: "Sea" }],
    media: {
      existing: [] as { id: string; alt_text: string }[],
      added: [{ client_id: CLIENT, file_name: "photo.jpg", mime_type: "image/jpeg" as const, size_bytes: 1000, alt_text: "alt" }],
      removed_media_ids: [] as string[],
      order: [{ kind: "new" as const, client_id: CLIENT }],
      cover: { kind: "new" as const, client_id: CLIENT },
    },
  };
}

const upload = (size: number, type: string) => ({ client_id: CLIENT, file_name: "p.jpg", mime_type: "image/jpeg" as const, size_bytes: 1000, alt_text: "", file: file(size, type) });

describe("mapDatabaseError", () => {
  it("maps the codes raised by our SQL functions", () => {
    assert.equal(mapDatabaseError({ message: "ROOM_FULL" }).code, "ROOM_FULL");
    assert.equal(mapDatabaseError({ message: "INVALID_INVITE_CODE" }).code, "INVALID_INVITE_CODE");
    assert.equal(mapDatabaseError({ message: "FORBIDDEN" }).code, "FORBIDDEN");
    assert.equal(mapDatabaseError({ message: "UNAUTHENTICATED" }).code, "UNAUTHENTICATED");
  });

  it("maps SQLSTATEs and never leaks raw database text", () => {
    assert.equal(mapDatabaseError({ code: "42501", message: "permission denied for table rooms" }).code, "FORBIDDEN");
    assert.equal(mapDatabaseError({ code: "23514", message: "new row violates check constraint" }).code, "VALIDATION_ERROR");
    assert.equal(mapDatabaseError({ code: "23505", message: "duplicate key" }).code, "CONFLICT");
    const unknown = mapDatabaseError({ code: "XX000", message: "secret internal detail" });
    assert.equal(unknown.code, "INTERNAL_ERROR");
    assert.equal(unknown.retryable, true);
    assert.ok(!unknown.message.includes("secret"));
  });
});

describe("planMemorySave", () => {
  it("uploads under {room}/{user}/{memory}/ and puts the path (never a URL) in the payload", () => {
    const ids = ["60000000-0000-4000-8000-000000000001"];
    const plan = planMemorySave(ROOM, USER, MEMORY, memoryInputSchema.parse(baseInput()), [upload(1000, "image/jpeg")], () => ids.shift() as string);
    assert.ok(!("error" in plan));
    if ("error" in plan) return;
    assert.equal(plan.uploads[0].path, `${ROOM}/${USER}/${MEMORY}/60000000-0000-4000-8000-000000000001.jpg`);
    const media = plan.payload.media as { added: { storage_path: string }[] };
    assert.equal(media.added[0].storage_path, plan.uploads[0].path);
    assert.ok(!JSON.stringify(plan.payload).includes("http"));
  });

  it("rejects files that do not match their declared metadata, before anything is uploaded", () => {
    const input = memoryInputSchema.parse(baseInput());
    assert.ok("error" in planMemorySave(ROOM, USER, MEMORY, input, [upload(999, "image/jpeg")]));
    assert.ok("error" in planMemorySave(ROOM, USER, MEMORY, input, [upload(1000, "image/gif")]));
    assert.ok("error" in planMemorySave(ROOM, USER, MEMORY, input, []));
  });

  it("builds the path convention the Storage policies check", () => {
    assert.equal(storagePath("r", "u", "m", "i", "image/webp"), "r/u/m/i.webp");
    assert.equal(storagePath("r", "u", "m", "i", "image/png"), "r/u/m/i.png");
  });
});

describe("contract validation used by the data layer", () => {
  it("accepts only the three themes and trims names", () => {
    assert.equal(roomInputSchema.parse({ name: "  Home ", life_period: "2026", theme: "night" }).name, "Home");
    assert.equal(roomInputSchema.safeParse({ name: "x", life_period: "y", theme: "neon" }).success, false);
    assert.equal(roomInputSchema.safeParse({ name: "", life_period: "y", theme: "rose" }).success, false);
  });

  it("limits a memory to 8 photos", () => {
    const added = Array.from({ length: 9 }, (_, i) => ({ client_id: `70000000-0000-4000-8000-00000000000${i}`, file_name: "a.jpg", mime_type: "image/jpeg" as const, size_bytes: 1, alt_text: "" }));
    const result = memoryInputSchema.safeParse({ ...baseInput(), media: { existing: [], added, removed_media_ids: [], order: added.map((a) => ({ kind: "new", client_id: a.client_id })), cover: null } });
    assert.equal(result.success, false);
  });
});

describe("memoryFromRow", () => {
  const row = {
    id: MEMORY, room_id: ROOM, author_id: USER, title: "T", body: "B", memory_date: "2026-10-01", mood: "happy", period_label: null, cover_media_id: "80000000-0000-4000-8000-000000000002",
    created_at: "2026-10-01T10:00:00+00:00", updated_at: "2026-10-01T10:00:00+00:00",
    memory_media: [
      { id: "80000000-0000-4000-8000-000000000001", memory_id: MEMORY, storage_path: "p/1.jpg", alt_text: "", mime_type: "image/jpeg", size_bytes: 10, position: 1, created_at: "2026-10-01T10:00:00+00:00" },
      { id: "80000000-0000-4000-8000-000000000002", memory_id: MEMORY, storage_path: "p/2.jpg", alt_text: "", mime_type: "image/jpeg", size_bytes: 10, position: 0, created_at: "2026-10-01T10:00:00+00:00" },
    ],
    memory_tags: [{ tags: { id: "90000000-0000-4000-8000-000000000001", room_id: ROOM, type: "place", label: "Cafe", created_at: "2026-10-01T10:00:00+00:00" } }],
  };

  it("orders photos by position, attaches signed URLs by path and flattens tags", () => {
    const memory = memoryFromRow(row, new Map([["p/2.jpg", "https://signed/2"]]));
    assert.deepEqual(memory.media.map((item) => item.position), [0, 1]);
    assert.equal(memory.media[0].signed_url, "https://signed/2");
    assert.equal(memory.media[1].signed_url, null);
    assert.equal(memory.tags[0].label, "Cafe");
    assert.equal(memory.cover_media_id, "80000000-0000-4000-8000-000000000002");
  });
});

describe("localDateString", () => {
  it("uses the local calendar day, not the UTC day (Asia/Bangkok just after midnight)", () => {
    const justAfterMidnightInBangkok = new Date("2026-10-09T18:30:00Z"); // 01:30 on 10 Oct in Bangkok
    assert.equal(justAfterMidnightInBangkok.toISOString().slice(0, 10), "2026-10-09"); // the old, wrong answer
    assert.equal(localDateString(justAfterMidnightInBangkok, "Asia/Bangkok"), "2026-10-10");
    assert.equal(localDateString(new Date("2026-10-10T16:59:00Z"), "Asia/Bangkok"), "2026-10-10");
    assert.equal(localDateString(new Date("2026-10-10T17:00:00Z"), "Asia/Bangkok"), "2026-10-11");
    assert.equal(localDateString(new Date("2026-12-31T20:00:00Z"), "Asia/Bangkok"), "2027-01-01");
  });
});
