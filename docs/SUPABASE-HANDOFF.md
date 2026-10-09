# Supabase integration handoff

Branch: `backend/supabase-integration`, based on `main` at `152fa36`. It does NOT include R1 (`origin/main` `b8b6bb1`); see "Merging with R1".

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

## Merging with R1 (`origin/main`, `b8b6bb1`)

R1 changed the contracts (`src/lib/contracts/*`, `docs/CONTRACTS.md`). A plain merge conflicts in `docs/CONTRACTS.md` and then fails to type-check, because this branch's data layer predates these contract changes. What must be reconciled:

1. `DearDaysDataSource` gained `getCurrentProfile`, `updateProfile`, `listRoomMembers`, `removeRoomMember`. `SupabaseDataSource` and `MockDataSource` (`src/lib/data/*`) must implement them. Today the same data lives in `src/lib/data/profile.ts` (own `Profile` and `RoomMember` types).
2. `Profile` is now `{ id, display_name, avatar_url, created_at, updated_at }`; this branch uses `{ user_id, email, display_name, bio }` and the `profiles` table has `user_id`, `display_name`, `bio`, `created_at`. Needs a migration (`avatar_url`, `updated_at`, decide `id` vs `user_id`) and updates to `getViewer` and the profile page/form.
3. `Room.description` (nullable, max 300) and `RoomInput.description` exist in R1, but there is no `rooms.description` column. Needs a migration; `room-form.tsx` currently shows the field disabled.
4. `RoomMemberView` includes `avatar_url`, `joined_at`; `removeRoomMember` is owner-only and owners cannot be removed. Needs an RPC or policy plus a Remove button in the members panel (not built).
5. `INVITE_CODE_LENGTH`, `ROOM_MAX_MEMBERS` constants and `inviteCodeSchema` (trim + uppercase) should be used by `join_room` callers and `join-room-form.tsx`.
6. Both branches edited `docs/CONTRACTS.md`: keep R1's text and append the "implementation" notes (`room_summaries`, RPCs, storage path, signed URLs).
7. Every new migration must be tested locally (`npm run test:db`, `npm run test:integration`), regenerated into `src/lib/supabase/database.types.ts` (`npm run gen:types`), and pushed to hosted with `db push --dry-run` first. Never `db reset` on hosted.

Suggested order: merge `origin/main` into this branch, fix types (1, 4, 5), add one migration for 2 and 3, then update the UI.

## Not done
Hosted browser flows and e-mail round-trip (above), member removal, avatar and description storage, rate limiting of invite-code guesses, mobile 3D loading (backlog in `docs/ROOM-3D-HANDOFF.md`), deployment.

## After pulling
```
git fetch origin
git switch backend/supabase-integration
npm install
cp .env.example .env.local   # fill in the three public values above
npm run typecheck && npm run lint && npm run test:unit
```
