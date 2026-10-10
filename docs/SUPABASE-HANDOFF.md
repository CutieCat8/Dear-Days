# Supabase integration handoff

Branch: `backend/supabase-integration`. Includes R1 (`origin/main` `b8b6bb1`): contracts, schemas and data layer are aligned (see "R1 merge").

## Status

| Area | State |
| --- | --- |
| Migrations, RLS, RPC, private bucket | Written. Tested on plain Postgres 15 (`npm run test:db`) and on a local Supabase stack (`npm run test:integration`, 19 checks). |
| Local tests | `test:db` (plain Postgres with Supabase's default privileges), `test:integration` 24 checks on a local Supabase stack, `test:unit` 44 tests. |
| Local browser flows (real mode) | Checked in Chrome against the local stack: sign up/in/out, create room + theme, invite link, join, full room, text and photo memories, edit/reorder/cover/delete, reload, logout, outsider 404, signed URL refresh in the 3D scene. |
| Hosted project `Dear-Days` (`bnukioggopvrnppxkkkk`) | All seven migrations (through `20261011000100`) applied with `db push` (no reset); see "Hosted: friends, frame slots and privileges" below. Verified read-only: RLS on all 7 tables, bucket `memory-media` private (10 MiB, jpeg/png/webp), 3 storage policies, anon has no table or RPC access, bucket public URL denied. Security advisor: only the RPCs meant for signed-in users remain. |
| Hosted browser flows | NOT tested: sign up with real e-mail, login/logout, invite to join, rooms, memories with photos, 3D, outsider and non-author permissions. A sign-up attempt hit the Supabase built-in mail rate limit, so no hosted test accounts exist. |
| Email confirmation | Dashboard setting is on (the app showed the "check your e-mail" notice and a real account was confirmed by its owner), but the full confirm-then-return flow was not run by us. Built-in mail is rate limited: configure custom SMTP before real use or before the 3-account test. |

## Run against the hosted project

Copy `.env.example` to `.env.local` and fill in public values only:

```
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://bnukioggopvrnppxkkkk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key: Dashboard > Settings > API Keys>
```

Restart `npm run dev` after changing it. Use `http://localhost:3000` (it is the allowed redirect URL for confirmation mails). Never put the secret/service-role key or the DB password in any env file. For the CLI (`npx supabase login`, `npx supabase link --project-ref bnukioggopvrnppxkkkk`) the DB password is only typed at the prompt. For a local stack see `docs/DATABASE-SETUP.md`. Test passwords are not in git.

## Files that overlap with friends' work

| Owner (REVISED-TASK-BREAKDOWN) | Files changed on this branch |
| --- | --- |
| Rooms / membership / invite / home / gallery / museum | `src/app/(app)/page.tsx`, `rooms/page.tsx`, `rooms/new`, `rooms/join`, `rooms/[roomId]/**`, `components/features/rooms/*` (new `invite-panel.tsx`), `components/features/museum/museum-room.tsx`, `museum-scene.tsx`, new `use-fresh-memories.ts` |
| Auth / profile / memory / media / tags | `components/features/auth/auth-screen.tsx`, `app/(auth)/*`, `app/auth/callback`, `src/proxy.ts`, `src/lib/supabase/*`, `components/features/profile/*`, `components/features/memory/*` (`memory-form.tsx`, new `delete-memory-button.tsx`), memory pages |
| Supabase / schema / RLS / storage (ซี) | `supabase/**`, `scripts/test-*`, `src/lib/data/**`, `docs/DATABASE-SETUP.md` |

Shared: `next.config.ts` (image host for signed URLs), `package.json` (scripts `test:unit`, `test:db`, `test:integration`, `gen:types`), `.env.example`.

## R1 merge (done on this branch)

`origin/main` was merged (one conflict, `docs/CONTRACTS.md`: both texts kept). The code was then aligned with the R1 contracts:

| R1 contract | Implementation |
| --- | --- |
| `Profile {id, display_name, avatar_url, created_at, updated_at}` | `profiles` keeps `user_id` as primary key (mapped to `id` in `profileFromRow`); migration `...0300` adds `avatar_url`, `updated_at`. The account page still shows e-mail and the short bio through `Account = Profile + {email, bio}` (`src/lib/data/profile.ts`), so no feature was dropped. |
| `getCurrentProfile`, `updateProfile` | `SupabaseDataSource` (session id only, never from input); `MockDataSource` returns the fixture profile, update is read-only. |
| `Room.description` (nullable, 1..300 after trim) | `rooms.description` + `create_room(..., p_description)`; empty/blank is stored as `null`; the room form saves it, the rooms list and the room header show it. |
| `RoomMemberView` + `listRoomMembers(roomId)` | owner first, public profile data only (no e-mail); a caller who is not a member gets `FORBIDDEN`. |
| `removeRoomMember(roomId, userId)` | RPC `remove_room_member`, rules from `docs/CONTRACTS.md`: caller not the owner (or room not visible) `FORBIDDEN`; target is the owner (including the owner removing themselves) `FORBIDDEN`; target not in the room `NOT_FOUND`; success `{ user_id }`. The room row is locked first (no interleaving with `join_room`). There is no DELETE grant on `room_members`, so the RPC is the only way. Edit room has "Remove member" with an inline confirm. |
| `inviteCodeSchema`, `INVITE_CODE_LENGTH`, `ROOM_MAX_MEMBERS` | the join form uses the shared length; the code is normalised (trim + uppercase) by the database function as before. |

Behaviour to know: memories written by a removed member stay in the room (the owner and the other members still see them); the removed person can no longer read or change anything (every policy needs membership) and can join again with the invite code while there is a free seat.

### Hosted project: R1 migration applied (2026-10-10)

`20261010000300_r1_contract_alignment.sql` was applied to `bnukioggopvrnppxkkkk` with `npx supabase db push` (no reset). Before: `migration list` showed only `...0300` pending and `db push --dry-run` listed only that file; the migration contains no data-deleting statement (only `ADD COLUMN` with null/default, `CREATE OR REPLACE VIEW`, a function replacement, one new trigger and one new RPC).

Checked on hosted after the push (read-only SQL and the public key):

| Check | Result |
| --- | --- |
| Existing data | unchanged: 1 user, 1 profile (same content hash), 0 rooms, 0 memories, 0 storage objects |
| Columns | `profiles(user_id, display_name, bio, created_at, avatar_url, updated_at)`, `rooms.description`, `room_summaries.description` |
| Functions | one `create_room(p_name, p_life_period, p_theme, p_description)`; `remove_room_member(uuid, uuid)` is `SECURITY DEFINER` with `search_path=""` |
| Privileges | `anon` can execute no function in `public`; `authenticated` can execute `create_room` and `remove_room_member`; `authenticated` has only SELECT on `room_members` (removal only through the RPC); room UPDATE columns `name, life_period, description, theme` (owner only by RLS); RLS enabled on every table |
| Public key, no session | `rpc/remove_room_member`, `rpc/create_room` and `GET /profiles` all return 42501 |
| Security advisor | only the RPCs and RLS helpers that signed-in users are meant to call, plus a new Auth warning: leaked-password protection is disabled (a Dashboard setting, not changed) |

Browser check on hosted with the owner's existing account (Sea), 2026-10-10, `npm run dev` pointing at hosted; no account was created and no e-mail was sent:

| Step | Result |
| --- | --- |
| Profile page reads the existing profile | pass (display name "Sea") |
| My rooms lists the existing rooms | pass (none existed; empty state shown, matches the database) |
| Create room "R1 hosted check" (rose) with a description | pass: row has the description and theme; room page shows the description, "ROSE THEME · 1 OF 2 MEMBERS" and the Edit button |
| Edit room shows the description and the invite panel, no Remove button with a single member | pass |
| Clear the description and save | pass: stored as `null`, `updated_at` moved (the first click of Save was not delivered by the browser driver; the second saved) |
| `remove_room_member` rules with Sea's identity (SQL, one transaction, always rolled back) | pass: owner removing themselves `FORBIDDEN`; unknown target `NOT_FOUND`; unknown room `FORBIDDEN`; `DELETE` on `room_members` `permission denied`; member count unchanged |
| Delete the test room from the UI | pass; afterwards the database is back to 1 user, 1 profile (same content hash), 0 rooms, 0 members, 0 storage objects |

Still not exercised on hosted: owner removing a real second member and the member losing access (needs a second account, so mail), memories with photos and the 3D scene on hosted, invite to join, outsider 404 on hosted, and the e-mail confirmation round trip. Those rules are covered by the local `test:db` / `test:integration` runs.

The owner / member / outsider permission rules for `remove_room_member` were tested on the local stack (`test:db`, `test:integration`); they were not exercised with two real hosted accounts (no hosted test accounts were created, to avoid sending mail); the single-account rules above were checked on hosted.

### Hosted: friends, frame slots and privileges (2026-10-10)

Applied to `bnukioggopvrnppxkkkk` with `npx supabase db push` after `--dry-run` listed only the pending files; no reset, no applied migration renamed. Before applying: a data and schema dump of the hosted project (kept outside the repository, it contains user data) and a snapshot of row counts and content hashes.

Review of `20261010000400_friends.sql` and `20261011000000_room_frame_slots.sql`: dependencies are in order; constraints, RLS and RPC rules match `docs/CONTRACTS.md`. One change before applying: `set_frame_layout` now refuses a layout of more than 40 frames before doing any work (it used to check after inserting). One gap found *after* applying and fixed by a new migration `20261011000100_tighten_table_privileges.sql`: `authenticated` kept every table privilege (including TRUNCATE) on `room_frame_slots` and on the `room_summaries` view, because only `anon` and `public` had been revoked. Row Level Security already blocked writes, and TRUNCATE is not reachable through the API, but the privileges are now SELECT only. The new test section and the default-privilege mimic in `bootstrap.sql` catch this class of mistake.

Checked on hosted after the pushes:

| Check | Result |
| --- | --- |
| Existing data | unchanged: 2 users, 2 profiles, 2 rooms, 28 memories, 34 media, 26 tags, 34 storage objects; content hashes of profiles, rooms and memories identical to the snapshot taken before |
| `profiles.username` | all rows filled by the backfill, all valid and distinct, NOT NULL, unique index present |
| Privileges | `authenticated`: SELECT only on every table/view except `rooms` and `memories` (SELECT, DELETE); no TRUNCATE, INSERT, REFERENCES or TRIGGER anywhere; `anon`: nothing; `anon` can execute no function |
| Security advisor | only the RPCs and RLS helpers signed-in users call, plus leaked-password protection off (Dashboard setting, unchanged) |
| App, owner's session, dev server | Profile page loads the username without the fallback (no warning in the server log); Friends & Rooms loads without the "not available" notice; no request to `/sign-in` |
| Frame slots in the UI (test room "R1 frames check (test)", two test memories) | "Arrange frames", chose the other photo for a frame: the two frames swapped, rows `L2` = memory A, `R4` = memory B in `room_frame_slots`; after a reload the same arrangement is shown |
| Friend requests and frame rules with the two real hosted accounts, in one transaction that was rolled back (nothing written) | request: pending; asking twice `CONFLICT`; yourself `VALIDATION_ERROR`; unknown username `NOT_FOUND`; the requester cannot accept; a stranger sees no friendships or profiles and gets `NOT_FOUND` on answer and remove; the addressee accepts; already friends `CONFLICT`; friends see no rooms or memories; either person unfriends and the profile is hidden again; direct INSERT/UPDATE/TRUNCATE on `friendships` and INSERT/TRUNCATE on `room_frame_slots` denied; a non-member gets `FORBIDDEN` on `set_frame_layout` and reads no slots; the owner saves, swaps and reads back the arrangement; a duplicate memory, a text-only memory and an oversized layout are refused and keep the previous arrangement; `anon` cannot call either RPC |

The test room and its two memories and two frame rows remain on hosted until the owner says they can be deleted.

**Not checked on hosted with real separate sign-ins:** a second account joining and using a room (member and outsider browsing, the member arranging frames in the UI, the outsider opening the room by URL), sending and accepting a friend request through the Friends & Rooms page, and the e-mail confirmation round trip. The rules were exercised with the two real accounts in the rolled-back transaction above, and with four accounts on the local stack (`test:integration`), not through two browser sessions on hosted.

**Known limits of the friends design (not changed here):** a pending request lets the sender read the whole profile row of the person asked (display name, avatar, bio); `send_friend_request` tells whether a username exists (`NOT_FOUND`) and has no rate limit, so usernames can be enumerated; declining deletes the request so it can be sent again.

## Not done
Multi-account browser flows on hosted and the e-mail round-trip (above), avatar upload (the column exists, no upload UI), rate limiting of invite-code guesses, mobile 3D loading (backlog in `docs/ROOM-3D-HANDOFF.md`), deployment.

## After pulling
```
git fetch origin
git switch backend/supabase-integration
npm install
cp .env.example .env.local   # fill in the three public values above
npm run typecheck && npm run lint && npm run test:unit
```
