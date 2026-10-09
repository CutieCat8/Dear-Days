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

## Hosted rollout checklist (nothing below has been done yet)
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
