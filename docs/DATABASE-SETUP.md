# Database, Auth and Storage setup

Schema source of truth: `supabase/migrations/*.sql` (never edit the hosted schema from the Dashboard without a migration).

## Data modes
`NEXT_PUBLIC_DATA_MODE` = `supabase` (real) or `mock` (read-only demo from `src/lib/contracts`). If omitted: `supabase` when URL + anon key are set, otherwise `mock`. Real mode with missing keys is a hard error, never a silent fallback to mock.
Only the public anon/publishable key is used. Never put the service-role/secret key in `NEXT_PUBLIC_*`, the client, or git.

## Local stack (recommended first)
```bash
npx supabase start -x studio,imgproxy,vector,edge-runtime,logflare,mailpit,supavisor
npx supabase status -o env      # copy API_URL and ANON_KEY / PUBLISHABLE_KEY into .env.local
npx supabase db reset           # LOCAL ONLY: re-applies migrations
```
Local email confirmation is disabled (`supabase/config.toml`).

## Hosted project
1. Verify you are linked to the intended project (`npx supabase projects list`, `npx supabase link`), and compare `npx supabase migration list`.
2. `npx supabase db push` applies new migrations. Do not use `db reset` against a hosted project.
3. Auth > URL configuration: add `<site>/auth/callback` to redirect URLs. If email confirmation is on, sign-up shows a "check your email" notice and the callback exchanges the code.
4. The private bucket `memory-media` (10 MiB, jpeg/png/webp) is created by the migration; keep it private.

## Model
- Tables: profiles, rooms, room_members, memories, memory_media, tags, memory_tags (RLS on all). Max 2 members per room enforced by a trigger that locks the room row; join is the atomic RPC `join_room`.
- `save_memory` writes memory + photos + order + cover + tags in one transaction. Storage cannot join that transaction: files are uploaded first (`{room_id}/{user_id}/{memory_id}/{file}`), removed on failure, and files of removed photos are deleted only after the save succeeds (best effort, logged).
- The DB stores storage paths only; the app creates 1-hour signed URLs. Those are not refreshed inside the open 3D scene.
- `member_count` comes from the `room_summaries` view. Room `description` is not stored (not in the contract).

## Tests
- `npm run test:db`: Docker, Postgres 15 with auth/storage stubs; constraints, RLS, RPCs, concurrent joins.
- `npm run test:integration`: needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` of a LOCAL stack (refuses non-local hosts); owner/partner/third/outsider flows incl. signed URLs and Storage.

## Known limits
Invite-code guessing is not rate-limited (32^8 space). No leave-room/remove-member, invite link or generated DB types yet.

## Hosted rollout checklist
Do these in order, and stop if a check does not match.

**1. Database (migrations / RLS / RPC)**
- [ ] Confirm the target project ref is the intended one (`npx supabase projects list`; `npx supabase link --project-ref <ref>`); never create a new project by accident.
- [ ] `npx supabase migration list` shows only `20261010000000_schema` and `20261010000100_security` as pending; the remote schema is empty or matches.
- [ ] `npx supabase db push --dry-run`, then `npx supabase db push`. Never `db reset` on hosted.
- [ ] Advisors (Dashboard > Advisors, or MCP `get_advisors`): no table without RLS, no exposed SECURITY DEFINER warnings beyond the intended RPCs.
- [ ] Run `npm run test:integration` against a **staging/local** copy; it refuses non-local hosts on purpose.

**2. Private Storage**
- [ ] Bucket `memory-media` exists, `public = false`, 10485760 bytes, jpeg/png/webp (created by the migration).
- [ ] The four storage policies exist on `storage.objects` (member read, own-folder insert, uploader/owner delete, no update).
- [ ] A signed-out request to `/storage/v1/object/public/memory-media/...` returns an error.

**3. Auth settings**
- [ ] Site URL = the deployed origin; Redirect URLs include `<origin>/auth/callback`.
- [ ] Decide email confirmation. On: sign-up shows "check your email" and the link returns through `/auth/callback?next=...`. Test with a real inbox (untested so far).
- [ ] Configure SMTP for real mail volume (default Supabase mail is rate limited). Keep password length/policy at least the default.

**4. App environment**
- [ ] `NEXT_PUBLIC_DATA_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public/publishable key only) in the host's env settings.
- [ ] No service-role/secret key anywhere in the app env. `next.config.ts` derives the image host from the URL.
- [ ] Rebuild after changing `NEXT_PUBLIC_*` (values are inlined at build time).

## Hosted project log: Dear-Days (`bnukioggopvrnppxkkkk`, ap-northeast-1, Postgres 17)
Done on 2026-10-10 with the CLI (`supabase login`, `supabase link`), never `db reset`:
1. Identity: project name, ref and status checked; before the push it had no tables in `public`, no buckets, no migration history and no users (a fresh project).
2. `db push --dry-run` listed exactly `20261010000000_schema`, `20261010000100_security`; then `db push` applied them. `migration list` shows local = remote.
3. Advisor (security) flagged `anon` being able to execute the RLS helper functions, so `20261010000200_revoke_anon_helpers` was added, tested on the local stack (`test:integration` 19/19, `test:db`) and pushed. Remaining advisor warnings are the RPCs signed-in users are meant to call (`create_room`, `join_room`, `save_memory`, `upsert_tags`) and the RLS helpers, which are required by the policies.
4. Verified read-only on hosted: RLS enabled on all 7 tables (view `room_summaries` is `security_invoker`); bucket `memory-media` private, 10485760 bytes, jpeg/png/webp; storage policies read/insert/delete; anon has no table privileges. With only the public key: `GET /rest/v1/rooms` and `rpc/is_room_member` return 42501, the bucket's public URL returns 400.
5. App environment: copy `.env.hosted` (URL + publishable key only, gitignored) to `.env.local`, restart `npm run dev`. The local file was saved as `.env.local.local-backup` (gitignored).

Not verified on hosted yet: Auth settings (Site URL / redirect URLs / email confirmation are set in the Dashboard, not by migrations), real e-mail sign-up and the browser flows. The built-in Supabase mail sender is heavily rate limited, so create test accounts sparingly or configure SMTP.

## Hosted migration status
All seven migrations are applied on `bnukioggopvrnppxkkkk` (2026-10-10, `db push`, no reset): `...0000_schema`, `...0100_security`, `...0200_revoke_anon_helpers`, `...0300_r1_contract_alignment`, `...0400_friends` (`profiles.username` with backfill, `friendships`, friend request RPCs, profile visibility for friends and pending requests), `...20261011000000_room_frame_slots` (`room_frame_slots`, `set_frame_layout`) and `...20261011000100_tighten_table_privileges`. Details and the checks that were run: `docs/SUPABASE-HANDOFF.md`. Not yet applied to hosted: `...0200_profile_media` and `...0300_memory_favorites`.

Supabase gives `authenticated` every privilege on a new public table or view by default, so every migration that adds one must `revoke all ... from authenticated` and grant back only what is needed. `20261011000100` fixes this for `room_frame_slots` and `room_summaries` (the first frame-slots migration only revoked from `anon`). `supabase/tests/bootstrap.sql` now mimics those default privileges and `tests.sql` (section 14) fails when a table is left with TRUNCATE, REFERENCES, TRIGGER, INSERT or a table-wide UPDATE for `authenticated`, or any privilege for `anon`.

Local stack: `npx supabase migration up --local`, then `npm run gen:types`. Hosted: `npx supabase db push --dry-run`, then `npx supabase db push`.
