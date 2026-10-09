# Supabase integration handoff

Branch: `backend/supabase-integration`. Includes R1 (`origin/main` `b8b6bb1`): contracts, schemas and data layer are aligned (see "R1 merge").

## Status

| Area | State |
| --- | --- |
| Migrations, RLS, RPC, private bucket | Written. Tested on plain Postgres 15 (`npm run test:db`) and on a local Supabase stack (`npm run test:integration`, 19 checks). |
| Local browser flows (real mode) | Checked in Chrome against the local stack: sign up/in/out, create room + theme, invite link, join, full room, text and photo memories, edit/reorder/cover/delete, reload, logout, outsider 404, signed URL refresh in the 3D scene. |
| Hosted project `Dear-Days` (`bnukioggopvrnppxkkkk`) | Migrations `20261010000000`, `...0100`, `...0200` applied with `db push` (no reset). Verified read-only: RLS on all 7 tables, bucket `memory-media` private (10 MiB, jpeg/png/webp), 3 storage policies, anon has no table or RPC access, bucket public URL denied. Security advisor: only the RPCs meant for signed-in users remain. |
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

### Hosted project: migration still pending

`20261010000300_r1_contract_alignment.sql` has NOT been applied to `bnukioggopvrnppxkkkk` (hosted has `...0000`, `...0100`, `...0200`). Until `db push` runs, with this branch pointed at hosted:

- Create room fails (the RPC has no `p_description` argument yet), and saving a room description fails;
- `removeRoomMember` fails (function missing), so Remove member does nothing useful;
- loading the signed-in profile (header name, account page, `getViewer`) fails, because the query selects `avatar_url` and `updated_at`, which do not exist yet; most signed-in pages call it, so the app is effectively unusable on hosted until the migration is applied.

So: do not use this branch against hosted before `npx supabase db push --dry-run` (expect only `20261010000300_r1_contract_alignment.sql`) and `npx supabase db push`. Run `npm run test:db` and `npm run test:integration` against a local stack first.

## Not done
Hosted browser flows and e-mail round-trip (above), avatar upload (the column exists, no upload UI), rate limiting of invite-code guesses, mobile 3D loading (backlog in `docs/ROOM-3D-HANDOFF.md`), deployment.

## After pulling
```
git fetch origin
git switch backend/supabase-integration
npm install
cp .env.example .env.local   # fill in the three public values above
npm run typecheck && npm run lint && npm run test:unit
```
