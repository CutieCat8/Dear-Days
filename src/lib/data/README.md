# Data access boundary

UI code imports contracts from `@/lib/contracts` and calls an implementation of `DearDaysDataSource`.
Components and route pages never query tables directly.

| File | Role |
| --- | --- |
| `config.ts` | `dataMode()`: `NEXT_PUBLIC_DATA_MODE` = `supabase` or `mock`. Unset: `supabase` when URL + anon key exist, else `mock`. Real mode never falls back to mock. |
| `server.ts` | Server Components: `getDataSource()`, `getViewer()`, `getRoomMembers()` (uses the cookie session). |
| `browser.ts` | Client Components: `createBrowserDataSource()` (uploads go straight to the private bucket with the user's session). |
| `supabase-source.ts` | `SupabaseDataSource(client)`, the real implementation. Also `refreshMediaUrls(paths)` for new signed URLs. |
| `mock-source.ts` | Read-only demo data; every mutation returns `INTERNAL_ERROR`. |
| `mappers.ts` | DB row to contract mapping. PostgREST embeds name the FK explicitly (`memory_media!memory_media_memory_id_fkey`) because `memories.cover_*` is a second relationship. |
| `memory-payload.ts` | Validates files against the declared metadata and builds the `save_memory` payload and storage paths `{room}/{user}/{memory}/{file}`. |
| `result.ts` | Maps Postgres/PostgREST errors to `AppErrorCode`; raw database text never reaches the UI. |
| `unwrap.ts` | Page helper: `UNAUTHENTICATED` redirects to `/sign-in`, `NOT_FOUND`/`FORBIDDEN` render 404, else throws. |
| `profile.ts`, `overview.ts` | Contract `Profile` (`getCurrentProfile`), account page data (`Account`: profile + e-mail + bio), `listRoomMembers` (`RoomMemberView`, owner first), home overview. |

Types: `src/lib/supabase/database.types.ts` is generated from the migrations. Regenerate after every migration:
`npx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts`.

Photos: the database stores storage paths only. `signed_url` is created per read (1 hour). The open 3D scene renews
the URLs before expiry and when the tab becomes visible again (`museum/use-fresh-memories.ts`), changing only the URL
strings; URLs are tied to the server data they were requested for, so nothing from another room can appear.

Tests: `npm run test:unit`, `npm run test:db`, `npm run test:integration` (see `docs/DATABASE-SETUP.md`).
