import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROFILE_MEDIA_CONSTRAINTS,
  profileMediaPath,
  saveProfileMedia,
  validateProfileMediaFile,
} from "../src/lib/data/profile-media";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const USER = "20000000-0000-4000-8000-000000000001";
const MEDIA = "60000000-0000-4000-8000-000000000001";

function file(size: number, type: string, name = "photo.jpg") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("profile media validation", () => {
  it("accepts JPEG, PNG and WebP within the profile limit", () => {
    for (const type of PROFILE_MEDIA_CONSTRAINTS.acceptedMimeTypes) {
      assert.equal(validateProfileMediaFile(file(1024, type)), null);
    }
  });

  it("rejects an unsupported type, an empty file and an oversized file", () => {
    assert.match(validateProfileMediaFile(file(100, "image/gif")) ?? "", /JPEG, PNG and WebP/);
    assert.match(validateProfileMediaFile(file(0, "image/png")) ?? "", /empty/);
    assert.match(validateProfileMediaFile(file(PROFILE_MEDIA_CONSTRAINTS.maxFileBytes + 1, "image/png")) ?? "", /5 MB/);
  });
});

describe("profile media paths", () => {
  it("keeps avatar and cover objects under the signed-in user's folder", () => {
    assert.equal(profileMediaPath(USER, "avatar", MEDIA, "image/webp"), `${USER}/avatar/${MEDIA}.webp`);
    assert.equal(profileMediaPath(USER, "cover", MEDIA, "image/png"), `${USER}/cover/${MEDIA}.png`);
  });

  it("does not derive an executable extension from the original filename", () => {
    assert.equal(profileMediaPath(USER, "avatar", MEDIA, "image/jpeg"), `${USER}/avatar/${MEDIA}.jpg`);
  });
});

function fakeSaveClient(updateSucceeds: boolean) {
  const events: string[] = [];
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: USER } }, error: null }) },
    storage: {
      from: () => ({
        upload: async (path: string) => { events.push(`upload:${path}`); return { error: null }; },
        remove: async (paths: string[]) => { events.push(`remove:${paths.join(",")}`); return { error: null }; },
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` }, error: null }),
      }),
    },
    from: () => ({
      update: (value: { avatar_path?: string; cover_path?: string }) => {
        events.push(`update:${value.avatar_path ?? value.cover_path}`);
        return { eq: () => ({ select: async () => updateSucceeds ? { data: [{ user_id: USER }], error: null } : { data: null, error: { code: "42501", message: "denied" } } }) };
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, events };
}

describe("profile media replacement order", () => {
  it("persists the new path before deleting the previous object", async () => {
    const oldPath = `${USER}/avatar/old.jpg`;
    const { client, events } = fakeSaveClient(true);
    const result = await saveProfileMedia(client, "avatar", file(10, "image/jpeg"), oldPath, () => MEDIA);
    assert.ok(result.ok);
    assert.deepEqual(events, [
      `upload:${USER}/avatar/${MEDIA}.jpg`,
      `update:${USER}/avatar/${MEDIA}.jpg`,
      `remove:${oldPath}`,
    ]);
  });

  it("cleans the new object and never deletes the previous object when persistence fails", async () => {
    const oldPath = `${USER}/cover/old.png`;
    const { client, events } = fakeSaveClient(false);
    const result = await saveProfileMedia(client, "cover", file(10, "image/png"), oldPath, () => MEDIA);
    assert.ok(!result.ok);
    assert.deepEqual(events, [
      `upload:${USER}/cover/${MEDIA}.png`,
      `update:${USER}/cover/${MEDIA}.png`,
      `remove:${USER}/cover/${MEDIA}.png`,
    ]);
    assert.ok(!events.includes(`remove:${oldPath}`));
  });
});
