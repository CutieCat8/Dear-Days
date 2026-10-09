/**
 * End-to-end check of the real data layer against a LOCAL Supabase stack (npx supabase start):
 * Auth, PostgREST, RPC, RLS and private Storage with an owner, a second member and an outsider.
 *
 *   npx supabase start
 *   npx supabase status -o env      # copy API_URL and ANON_KEY
 *   $env:SUPABASE_URL=...; $env:SUPABASE_ANON_KEY=...   (or export on bash)
 *   npm run test:integration
 *
 * Refuses to run against anything that is not localhost: it creates users, rooms and files.
 */
import assert from "node:assert/strict";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { MemoryInput, NewMediaUpload } from "../src/lib/contracts/types";
import { listRoomMembers } from "../src/lib/data/profile";
import { SupabaseDataSource } from "../src/lib/data/supabase-source";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY (from `npx supabase status -o env`).");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) throw new Error(`Refusing to run against a non-local project: ${url}`);

const run = Date.now().toString(36);
let passed = 0;
const step = async (name: string, body: () => Promise<void>) => {
  await body();
  passed += 1;
  console.log(`  ok  ${name}`);
};

// 1x1 transparent PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const png = () => new File([PNG], "p.png", { type: "image/png" });

async function signUp(label: string) {
  const client = createClient(url as string, anon as string, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({ email: `${label}-${run}@example.com`, password: "test-password-1", options: { data: { display_name: label } } });
  if (error || !data.session) throw new Error(`sign up failed for ${label}: ${error?.message ?? "no session (is e-mail confirmation on?)"}`);
  return { client, id: data.user!.id, source: new SupabaseDataSource(client) };
}

function memoryInput(overrides: Partial<MemoryInput> = {}): MemoryInput {
  return {
    title: "Doi Suthep",
    body: "Sunrise 100% worth it",
    memory_date: "2026-10-02",
    mood: "happy",
    period_label: "Year 1",
    tags: [{ type: "person", label: "Sea" }, { type: "place", label: "Doi Suthep" }],
    media: { existing: [], added: [], removed_media_ids: [], order: [], cover: null },
    ...overrides,
  };
}

function withPhotos(count: number): { input: MemoryInput; uploads: NewMediaUpload[] } {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  const uploads: NewMediaUpload[] = ids.map((id, i) => ({ client_id: id, file_name: `p${i}.png`, mime_type: "image/png", size_bytes: PNG.length, alt_text: `photo ${i}`, file: png() }));
  return {
    uploads,
    input: memoryInput({
      media: {
        existing: [],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the file itself is not part of the metadata
        added: uploads.map(({ file: _unused, ...meta }) => meta),
        removed_media_ids: [],
        order: ids.map((id) => ({ kind: "new" as const, client_id: id })),
        cover: { kind: "new" as const, client_id: ids[1] ?? ids[0] },
      },
    }),
  };
}

async function exists(client: SupabaseClient, path: string) {
  const { data } = await client.storage.from("memory-media").createSignedUrl(path, 60);
  if (!data?.signedUrl) return false;
  return (await fetch(data.signedUrl)).status === 200;
}

async function main() {
  const owner = await signUp("owner");
  const partner = await signUp("partner");
  const third = await signUp("third");
  const outsider = await signUp("outsider");

  let roomId = "";
  let code = "";
  let memoryId = "";
  let paths: string[] = [];

  await step("owner creates a night room and is its only member", async () => {
    const created = await owner.source.createRoom({ name: "University Days", life_period: "2026-2027", theme: "night" });
    assert.ok(created.ok, JSON.stringify(created));
    roomId = created.data.id;
    code = created.data.invite_code;
    assert.equal(created.data.theme, "night");
    assert.equal(created.data.member_count, 1);
    assert.match(code, /^[A-Z2-9]{8}$/);
    const list = await owner.source.listRooms();
    assert.ok(list.ok && list.data.length === 1);
  });

  await step("invalid room input is a VALIDATION_ERROR with field errors", async () => {
    const bad = await owner.source.createRoom({ name: "", life_period: "x", theme: "night" });
    assert.ok(!bad.ok && bad.error.code === "VALIDATION_ERROR" && bad.error.field_errors?.name);
  });

  await step("an outsider cannot see or find the room", async () => {
    const got = await outsider.source.getRoom(roomId);
    assert.ok(!got.ok && got.error.code === "NOT_FOUND");
    const list = await outsider.source.listRooms();
    assert.ok(list.ok && list.data.length === 0);
    const direct = await outsider.client.from("rooms").select("*");
    assert.equal(direct.data?.length, 0, "direct table query must be empty for a non-member");
  });

  await step("join: wrong code, success, full room, idempotent", async () => {
    const wrong = await partner.source.joinRoom("ZZZZZZZZ");
    assert.ok(!wrong.ok && wrong.error.code === "INVALID_INVITE_CODE");
    const joined = await partner.source.joinRoom(code.toLowerCase());
    assert.ok(joined.ok && joined.data.id === roomId && joined.data.member_count === 2, JSON.stringify(joined));
    const full = await third.source.joinRoom(code);
    assert.ok(!full.ok && full.error.code === "ROOM_FULL");
    const again = await partner.source.joinRoom(code);
    assert.ok(again.ok);
  });

  await step("a member cannot rewrite membership or the room directly", async () => {
    const insert = await third.client.from("room_members").insert({ room_id: roomId, user_id: third.id, role: "member" });
    assert.ok(insert.error, "direct membership insert must be refused");
    const rename = await partner.source.updateRoom(roomId, { name: "Hijack" });
    assert.ok(!rename.ok && rename.error.code === "FORBIDDEN");
    const renamed = await owner.source.updateRoom(roomId, { theme: "rose" });
    assert.ok(renamed.ok && renamed.data.theme === "rose");
  });

  await step("names of room members are readable, other people are not", async () => {
    const members = await listRoomMembers(partner.client, [roomId]);
    assert.ok(members.ok);
    assert.deepEqual(members.data.get(roomId)?.map((m) => m.display_name).sort(), ["owner", "partner"]);
    const stranger = await outsider.client.from("profiles").select("user_id").eq("user_id", owner.id);
    assert.equal(stranger.data?.length, 0);
  });

  await step("text-only memory (no photos, no mood)", async () => {
    const created = await owner.source.createMemory(roomId, memoryInput({ mood: null, tags: [] }), []);
    assert.ok(created.ok, JSON.stringify(created));
    assert.equal(created.data.media.length, 0);
    assert.equal(created.data.cover_media_id, null);
  });

  await step("memory with 3 photos, cover, tags; photos are readable only through signed URLs", async () => {
    const { input, uploads } = withPhotos(3);
    const created = await owner.source.createMemory(roomId, input, uploads);
    assert.ok(created.ok, JSON.stringify(created));
    memoryId = created.data.id;
    paths = created.data.media.map((m) => m.storage_path);
    assert.equal(created.data.media.length, 3);
    assert.deepEqual(created.data.media.map((m) => m.position), [0, 1, 2]);
    assert.equal(created.data.cover_media_id, created.data.media[1].id);
    assert.equal(created.data.tags.length, 2);
    for (const media of created.data.media) {
      assert.ok(media.signed_url, "signed url present");
      assert.equal((await fetch(media.signed_url as string)).status, 200);
      assert.ok(media.storage_path.startsWith(`${roomId}/${owner.id}/${memoryId}/`));
      const publicUrl = `${url}/storage/v1/object/public/memory-media/${media.storage_path}`;
      assert.notEqual((await fetch(publicUrl)).status, 200, "the bucket must not be public");
    }
  });

  await step("an outsider reads nothing: rows, signed URLs and files", async () => {
    const got = await outsider.source.getMemory(roomId, memoryId);
    assert.ok(!got.ok && got.error.code === "NOT_FOUND");
    const list = await outsider.source.listMemories({ room_id: roomId });
    assert.ok(list.ok && list.data.total === 0);
    const signed = await outsider.client.storage.from("memory-media").createSignedUrl(paths[0], 60);
    assert.ok(signed.error || !signed.data?.signedUrl, "outsider must not get a signed URL");
    const dl = await outsider.client.storage.from("memory-media").download(paths[0]);
    assert.ok(dl.error, "outsider must not download the object");
    const up = await outsider.client.storage.from("memory-media").upload(`${roomId}/${outsider.id}/x/y.png`, png(), { contentType: "image/png" });
    assert.ok(up.error, "outsider must not upload into someone else's room");
  });

  await step("a member reads the partner's memory and photos but cannot change or delete them", async () => {
    const got = await partner.source.getMemory(roomId, memoryId);
    assert.ok(got.ok && got.data.media.every((m) => m.signed_url));
    assert.equal((await fetch(got.data.media[0].signed_url as string)).status, 200);
    const edit = await partner.source.updateMemory(roomId, memoryId, memoryInput({ title: "Changed", media: { existing: got.data.media.map((m) => ({ id: m.id, alt_text: m.alt_text })), added: [], removed_media_ids: [], order: got.data.media.map((m) => ({ kind: "existing" as const, id: m.id })), cover: null } }), []);
    assert.ok(!edit.ok && edit.error.code === "FORBIDDEN", JSON.stringify(edit));
    const del = await partner.source.deleteMemory(roomId, memoryId);
    assert.ok(!del.ok && del.error.code === "FORBIDDEN", JSON.stringify(del));
    const stillThere = await owner.source.getMemory(roomId, memoryId);
    assert.ok(stillThere.ok && stillThere.data.title === "Doi Suthep");
  });

  await step("failed save by a non-author leaves no orphan upload", async () => {
    const before = await owner.source.getMemory(roomId, memoryId);
    assert.ok(before.ok);
    const extra = withPhotos(1);
    const input = memoryInput({ title: "Hijack", media: { ...extra.input.media, existing: before.data.media.map((m) => ({ id: m.id, alt_text: m.alt_text })), order: [...before.data.media.map((m) => ({ kind: "existing" as const, id: m.id })), ...extra.input.media.order], cover: null } });
    const result = await partner.source.updateMemory(roomId, memoryId, input, extra.uploads);
    assert.ok(!result.ok && result.error.code === "FORBIDDEN");
    const files = await owner.client.storage.from("memory-media").list(`${roomId}/${partner.id}/${memoryId}`);
    assert.equal(files.data?.length ?? 0, 0, "the partner's rejected upload must have been cleaned up");
  });

  await step("update: remove a photo, add one, reorder, move the cover; removed file is deleted only after success", async () => {
    const before = await owner.source.getMemory(roomId, memoryId);
    assert.ok(before.ok);
    const [a, b, c] = before.data.media;
    const extra = withPhotos(1);
    const result = await owner.source.updateMemory(
      roomId,
      memoryId,
      memoryInput({
        title: "Doi Suthep 2",
        tags: [{ type: "place", label: "doi suthep" }],
        media: {
          existing: [{ id: c.id, alt_text: "renamed" }, { id: a.id, alt_text: a.alt_text }],
          added: extra.input.media.added,
          removed_media_ids: [b.id],
          order: [{ kind: "new", client_id: extra.uploads[0].client_id }, { kind: "existing", id: c.id }, { kind: "existing", id: a.id }],
          cover: { kind: "existing", id: c.id },
        },
      }),
      extra.uploads,
    );
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.data.title, "Doi Suthep 2");
    assert.deepEqual(result.data.media.map((m) => m.position), [0, 1, 2]);
    assert.equal(result.data.media[1].id, c.id);
    assert.equal(result.data.media[1].alt_text, "renamed");
    assert.equal(result.data.cover_media_id, c.id);
    assert.equal(result.data.tags.length, 1, "tags were replaced; 'doi suthep' reuses the existing tag");
    assert.equal(await exists(owner.client, b.storage_path), false, "removed photo deleted from Storage");
    assert.equal(await exists(owner.client, a.storage_path), true, "kept photo still there");
    paths = result.data.media.map((m) => m.storage_path);
  });

  await step("mismatching files are rejected before anything is stored", async () => {
    const before = await owner.source.getMemory(roomId, memoryId);
    assert.ok(before.ok);
    const { input, uploads } = withPhotos(1);
    const bad = await owner.source.updateMemory(roomId, memoryId, input, [{ ...uploads[0], size_bytes: 12345 }]);
    assert.ok(!bad.ok && bad.error.code === "VALIDATION_ERROR");
    const after = await owner.source.getMemory(roomId, memoryId);
    assert.ok(after.ok && after.data.media.length === before.data.media.length);
  });

  await step("gallery: search, mood, tag filters, pagination, total", async () => {
    for (let i = 1; i <= 24; i += 1) {
      const made = await partner.source.createMemory(roomId, memoryInput({ title: `Day ${i}`, body: i % 5 === 0 ? "100% sure_ok" : "plain", memory_date: `2026-02-${String(i).padStart(2, "0")}`, mood: i % 2 ? "sad" : null, tags: i % 4 === 0 ? [{ type: "person", label: "Mint" }] : [] }), []);
      assert.ok(made.ok, JSON.stringify(made));
    }
    const all = await owner.source.listMemories({ room_id: roomId, page_size: 10 });
    assert.ok(all.ok);
    assert.equal(all.data.total, 26);
    assert.equal(all.data.items.length, 10);
    assert.equal(all.data.has_more, true);
    const last = await owner.source.listMemories({ room_id: roomId, page: 3, page_size: 10 });
    assert.ok(last.ok && last.data.items.length === 6 && last.data.has_more === false);
    const like = await owner.source.listMemories({ room_id: roomId, query: "100% sure" });
    assert.ok(like.ok && like.data.total === 4, `LIKE wildcard escaped, got ${like.ok ? like.data.total : "error"}`);
    const underscore = await owner.source.listMemories({ room_id: roomId, query: "s_re" });
    assert.ok(underscore.ok && underscore.data.total === 0, "underscore must be literal, not a wildcard");
    const sad = await owner.source.listMemories({ room_id: roomId, moods: ["sad"] });
    assert.ok(sad.ok && sad.data.total === 12);
    const none = await owner.source.listMemories({ room_id: roomId, moods: [null] });
    assert.ok(none.ok && none.data.total === 13, `null-mood total ${none.ok ? none.data.total : "error"}`); // 12 in the loop + the text-only memory
    const tags = await owner.source.listTags(roomId);
    assert.ok(tags.ok);
    const mint = tags.data.find((tag) => tag.label === "Mint");
    assert.ok(mint);
    const byTag = await owner.source.listMemories({ room_id: roomId, person_tag_ids: [mint.id] });
    assert.ok(byTag.ok && byTag.data.total === 6);
    const range = await owner.source.listMemories({ room_id: roomId, date_from: "2026-02-05", date_to: "2026-02-07" });
    assert.ok(range.ok && range.data.total === 3);
    const asc = await owner.source.listMemories({ room_id: roomId, sort: "memory_date_asc", page_size: 1 });
    assert.ok(asc.ok && asc.data.items[0].title === "Day 1");
  });

  await step("tags: create-or-reuse is case-insensitive and room-scoped", async () => {
    const result = await partner.source.upsertTags(roomId, [{ type: "person", label: "MINT" }, { type: "place", label: "Cafe" }]);
    assert.ok(result.ok && result.data.length === 2);
    const out = await outsider.source.upsertTags(roomId, [{ type: "person", label: "x" }]);
    assert.ok(!out.ok && out.error.code === "FORBIDDEN");
  });

  await step("author deletes a memory: row and photos are gone", async () => {
    const del = await owner.source.deleteMemory(roomId, memoryId);
    assert.ok(del.ok);
    const gone = await owner.source.getMemory(roomId, memoryId);
    assert.ok(!gone.ok && gone.error.code === "NOT_FOUND");
    for (const path of paths) assert.equal(await exists(owner.client, path), false, `object ${path} should be deleted`);
  });

  await step("unauthenticated requests are refused", async () => {
    const anonymous = new SupabaseDataSource(createClient(url as string, anon as string, { auth: { persistSession: false } }));
    const rooms = await anonymous.listRooms();
    assert.ok(!rooms.ok && rooms.error.code === "UNAUTHENTICATED");
    const raw = createClient(url as string, anon as string, { auth: { persistSession: false } });
    const direct = await raw.from("rooms").select("*");
    assert.ok(direct.error || (direct.data?.length ?? 0) === 0, "anon key alone reads nothing");
  });

  await step("only the owner deletes the room; photos of both members are removed with it", async () => {
    const mine = withPhotos(1);
    const a = await owner.source.createMemory(roomId, mine.input, mine.uploads);
    const theirs = withPhotos(1);
    const b = await partner.source.createMemory(roomId, theirs.input, theirs.uploads);
    assert.ok(a.ok && b.ok);
    const paths2 = [...a.data.media, ...b.data.media].map((m) => m.storage_path);
    const denied = await partner.source.deleteRoom(roomId);
    assert.ok(!denied.ok && denied.error.code === "FORBIDDEN");
    const deleted = await owner.source.deleteRoom(roomId);
    assert.ok(deleted.ok, JSON.stringify(deleted));
    const gone = await owner.source.getRoom(roomId);
    assert.ok(!gone.ok && gone.error.code === "NOT_FOUND");
    const left = await partner.source.listRooms();
    assert.ok(left.ok && left.data.length === 0);
    for (const path of paths2) assert.equal(await exists(partner.client, path), false);
  });

  await step("signing out leaves no readable data", async () => {
    await owner.client.auth.signOut();
    const after = await owner.source.listRooms();
    assert.ok(!after.ok && after.error.code === "UNAUTHENTICATED");
  });

  console.log(`\n${passed} integration checks passed against ${url}`);
}

main().catch((error) => {
  console.error("\nINTEGRATION TEST FAILED:", error);
  process.exit(1);
});
