# Dear Days — Supabase Integration Guide (R4 handoff + DB structure)

สถานะ ณ 9 ตุลาคม 2026: แอปรันใน **mock mode** (ไม่มี `.env.local`) โค้ด Auth ของ R4 เขียนไว้ครบแล้วแต่ยังไม่ได้ทดสอบกับ Supabase จริง เอกสารนี้บอก (1) ต้องทำอะไรตรงไหนเมื่อมี DB จริง และ (2) โครงสร้าง DB ที่ application contracts ต้องการ

> ส่วนที่ 2 เป็น **ข้อเสนอจากฝั่ง application ให้ซีใช้ทำ R2/R3** ซีเป็นเจ้าของ schema, migrations, RLS และ Storage ตาม `REVISED-TASK-BREAKDOWN.md` — SQL ในเอกสารนี้เป็น draft ไม่ใช่ migration ห้ามรันตรงบน production

---

## 1. Mock mode ทำงานอย่างไร

`src/lib/supabase/config.ts`

| สภาพแวดล้อม | ผลลัพธ์ |
| --- | --- |
| ไม่มี env + `npm run dev` | **mock mode**: Sign in/Sign up validate ด้วย Zod แล้ว redirect เลยโดยไม่ login จริง, Sign out ไป `/sign-in`, proxy ปล่อยผ่านทุกหน้า |
| มี env | ใช้ Supabase จริงทันทีโดยไม่ต้องแก้โค้ด |
| ไม่มี env + production | ไม่ fallback เป็น mock; ฟอร์มขึ้น "Sign-in is not available right now." |

ดังนั้น "เชื่อม DB จริง" สำหรับ R4 = ใส่ env แล้วทดสอบ ไม่ต้องย้ายโค้ด

---

## 2. เมื่อมี Supabase จริง: ต้องทำอะไร ตรงไหน

### 2.1 Environment

สร้าง `.env.local` (ถูก gitignore แล้ว) ตาม `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # หรือ legacy anon key
```

- เอาจาก Dashboard → Project Settings → Data API / API Keys
- **ห้าม**ใส่ `service_role` / secret key ในไฟล์ที่ขึ้นต้น `NEXT_PUBLIC_` หรือ commit ลง Git
- ใส่แล้วต้อง **restart `npm run dev`** (dev server cache env เดิม)
- มี project ทดสอบชื่อ `dear-days` (org `jirawamon`, Singapore) สร้างไว้แล้วแต่ยังว่าง ใช้ได้หากทีมตกลง

### 2.2 Supabase Dashboard settings (ซีตั้งค่า)

| Setting | ค่าแนะนำ | เหตุผล |
| --- | --- | --- |
| Authentication → URL Configuration → Site URL | `http://localhost:3000` (dev), production URL ตอน R17 | ลิงก์ในอีเมลพากลับมาที่แอป |
| Redirect URLs | `http://localhost:3000/**`, `https://<prod-domain>/**` | อนุญาต `emailRedirectTo` |
| Email → Confirm email | ตัดสินใจร่วมกัน (ดู 2.3 ข้อ 4) | เปลี่ยน flow หลัง sign up |
| SMTP | ตั้ง custom SMTP ก่อน production | อีเมลฟรีของ Supabase ส่งได้ไม่กี่ฉบับ/ชั่วโมง |

### 2.3 จุดในโค้ด

**ทำงานเองเมื่อมี env — ไม่ต้องแก้ แต่ต้องทดสอบ:**

| ไฟล์:บรรทัด | สิ่งที่ทำ |
| --- | --- |
| `src/lib/supabase/config.ts:16` | `isMockAuthMode()` — สวิตช์ mock/จริง |
| `src/lib/auth/actions.ts:66` | Sign in → `signInWithPassword` (บรรทัด 73) |
| `src/lib/auth/actions.ts:88` | Sign up → `auth.signUp` ส่ง `display_name` ใน user metadata (บรรทัด 99) |
| `src/lib/auth/actions.ts:113` | Sign out → `auth.signOut` (บรรทัด 116) |
| `src/lib/auth/actions.ts:35` | `mapAuthError` แปลง error code ของ Supabase เป็น `DataError` |
| `src/proxy.ts:13` | ไม่มี env = ปล่อยผ่าน; มี env = refresh session + `getClaims()` (บรรทัด 28) + redirect ตาม login state |

**ต้องเพิ่ม/ตัดสินใจเมื่อมี DB จริง:**

| # | ไฟล์:บรรทัด | งาน | ขึ้นกับ |
| --- | --- | --- | --- |
| 1 | `src/lib/auth/actions.ts:97` | ถ้าซีใช้ trigger `handle_new_user` (ข้อเสนอ 3.4) → ลบ TODO นี้ทิ้ง; ถ้าไม่ใช้ trigger → upsert `profiles` ตรงนี้หลัง `signUp` สำเร็จ | R2 |
| 2 | `src/lib/auth/actions.ts:98` | ถ้าเปิด Confirm email → ใส่ `options.emailRedirectTo` และสร้าง `src/app/auth/confirm/route.ts` ที่เรียก `supabase.auth.verifyOtp({ type, token_hash })` แล้ว redirect ไป `next` (ต้องแก้ email template ให้ใช้ `{{ .TokenHash }}`) | Dashboard setting |
| 3 | `src/components/features/auth/auth-screen.tsx:121` | "Forgot password?" — ทำ flow `resetPasswordForEmail` + หน้าตั้งรหัสใหม่ หรือเอาลิงก์ออกจาก MVP | ทีมตัดสินใจ |
| 4 | `src/lib/data/session.ts` → `getSessionUserId()` | เปลี่ยนจาก mock user เป็น `auth.getClaims()` → `claims.sub` | R6 |
| 5 | `src/lib/data/profile.ts` | `getCurrentProfile` / `updateProfile` / `getProfileStats` → query `profiles`, `room_members`, `memories` (ดู TODO ในไฟล์) | R5 |
| 6 | `src/lib/data/memories.ts` | `listMemories` … `deleteMemory`, `listTags`, `upsertTags` → Supabase; `applyMediaPlan` → Storage upload/signed URL/cleanup | R6–R7 |
| 7 | `src/lib/data/rooms.ts` | read-only `listRooms`/`getRoom` ชั่วคราว — สิรวิชญ์แทนด้วยของจริง | R9 |
| 8 | `src/lib/data/mock-store.ts` | ลบทิ้งเมื่อทุก function อ่าน Supabase แล้ว | R6 |
| 9 | `next.config.ts` → `bodySizeLimit` | ลดลงถ้าเปลี่ยนเป็น upload ตรงไป Storage | R7 |

หน้า UI และ Server Actions (`memory-actions.ts`, `profile-actions.ts`, `page-guards.ts`) เรียกผ่าน function เหล่านี้อยู่แล้ว **ไม่ต้องแก้** เมื่อสลับเป็น Supabase ตราบใดที่ signature และ error code เหมือนเดิม

> บรรทัดอ้างอิงตาม commit ที่เขียนเอกสารนี้ ถ้าโค้ดเลื่อน ให้ค้นด้วย `TODO(R4` หรือ `isMockAuthMode`

### 2.4 Checklist ทดสอบ R4 กับ Supabase จริง

- [ ] Sign up ด้วยอีเมลใหม่ → (Confirm email ปิด) เข้า `/` ทันที / (เปิด) เห็นข้อความให้เช็กอีเมล
- [ ] มีแถวใน `profiles` พร้อม `display_name` ที่กรอก (หลัง R2)
- [ ] Refresh แล้วยัง login อยู่
- [ ] ยังไม่ login เปิด `/rooms/join?code=ABCD1234` → ไป `/sign-in?next=...` → login แล้วกลับหน้าเดิม
- [ ] Login แล้วเปิด `/sign-in` → ถูกพาไป `/`
- [ ] รหัสผิด → "Email or password is incorrect."; อีเมลซ้ำ → ไม่บอกว่ามีบัญชีอยู่แล้ว (กัน enumeration)
- [ ] Sign out → เปิด `/` ไม่ได้
- [ ] ค้น client bundle (`.next/static`) ไม่พบ `service_role`

---

## 3. โครงสร้าง DB ที่ application ต้องการ (ข้อเสนอสำหรับ R2/R3)

ชื่อ field ตรงกับ `docs/CONTRACTS.md` และ `src/lib/contracts/schemas.ts` (`snake_case`) เพื่อลด mapping

### 3.1 ภาพรวม

```
auth.users 1─1 profiles
profiles   1─* rooms (owner_id)
rooms      1─* room_members *─1 profiles      (สูงสุด 2 แถวต่อห้อง, owner 1)
rooms      1─* memories     *─1 profiles (author_id)
memories   1─* memory_media                    (สูงสุด 8, position 0..n-1)
rooms      1─* tags
memories   *─* tags  ผ่าน memory_tags
Storage bucket `memory-media` (private): {room_id}/{memory_id}/{media_id}.{ext}
```

### 3.2 ตาราง

**profiles**

| column | type | constraint |
| --- | --- | --- |
| id | uuid | PK, FK → `auth.users(id)` on delete cascade |
| display_name | text | not null, length 1..50 |
| bio | text | null, length ≤ 160 |
| avatar_url | text | null (MVP ยังไม่มี upload) |
| created_at, updated_at | timestamptz | not null default now() |

**rooms**

| column | type | constraint |
| --- | --- | --- |
| id | uuid | PK default `gen_random_uuid()` |
| owner_id | uuid | not null, FK → profiles on delete cascade |
| name | text | not null, length 1..80 |
| life_period | text | not null, length 1..80 |
| description | text | null, length ≤ 300 |
| theme | text | not null, in (`sunrise`, `rose`, `night`) |
| invite_code | text | not null, **unique**, `~ '^[A-Z0-9]{8}$'`, สุ่มฝั่ง DB |
| created_at, updated_at | timestamptz | not null default now() |

`member_count` ใน contract **ไม่เก็บเป็นคอลัมน์** — นับจาก `room_members` (view หรือ `select count`) เพื่อไม่ให้ค่าเพี้ยน

**room_members**

| column | type | constraint |
| --- | --- | --- |
| room_id | uuid | FK → rooms on delete cascade |
| user_id | uuid | FK → profiles on delete cascade |
| role | text | not null, in (`owner`, `member`) |
| joined_at | timestamptz | not null default now() |

- PK `(room_id, user_id)` → join ซ้ำไม่เกิดแถวซ้ำ
- unique partial index `(room_id) where role = 'owner'` → owner คนเดียว
- จำกัด 2 คนใน RPC `join_room` (lock แถว room ก่อนนับ) + trigger กันการ insert ตรง

**memories**

| column | type | constraint |
| --- | --- | --- |
| id | uuid | PK |
| room_id | uuid | not null, FK → rooms on delete cascade |
| author_id | uuid | not null, FK → profiles; **ตั้งจาก `auth.uid()` ไม่รับจาก client** |
| title | text | not null, length 1..120 |
| body | text | not null, length 1..10000 |
| memory_date | date | not null |
| mood | text | **null ได้**, in (`awful`, `stressed`, `sad`, `relaxed`, `happy`, `excited`) |
| period_label | text | null, length ≤ 80 |
| cover_media_id | uuid | null, FK → memory_media(id) on delete set null |
| created_at, updated_at | timestamptz | not null default now() |

index: `(room_id, memory_date desc)`, `(room_id, updated_at desc)`; ค้น title/body ใช้ `pg_trgm` หรือ full-text ตามที่ซีเลือก

**memory_media**

| column | type | constraint |
| --- | --- | --- |
| id | uuid | PK |
| memory_id | uuid | not null, FK → memories on delete cascade |
| storage_path | text | not null, unique |
| alt_text | text | not null default '', length ≤ 300 |
| mime_type | text | in (`image/jpeg`, `image/png`, `image/webp`) |
| size_bytes | integer | > 0 and ≤ 10485760 |
| position | integer | ≥ 0; unique `(memory_id, position)` deferrable (ให้ reorder ใน transaction ได้) |
| created_at | timestamptz | not null default now() |

`signed_url` ใน contract **ไม่เก็บใน DB** — data layer สร้างตอนอ่าน; จำกัด 8 รูป/memory ด้วย trigger หรือใน RPC

**tags**

| column | type | constraint |
| --- | --- | --- |
| id | uuid | PK |
| room_id | uuid | not null, FK → rooms on delete cascade |
| type | text | in (`person`, `place`) |
| label | text | not null, length 1..50 |
| created_at | timestamptz | not null default now() |

unique `(room_id, type, lower(label))` → `upsertTags` ไม่สร้างซ้ำ

**memory_tags**

| column | type | constraint |
| --- | --- | --- |
| memory_id | uuid | FK → memories on delete cascade |
| tag_id | uuid | FK → tags on delete cascade |

PK `(memory_id, tag_id)`; tag ต้องอยู่ห้องเดียวกับ memory (ตรวจด้วย trigger)

### 3.3 RLS (R3)

helper: `is_room_member(room_id)` และ `is_room_owner(room_id)` แบบ `security definer` (กัน policy วนซ้ำบน `room_members`)

| ตาราง | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| profiles | ตัวเอง + คนที่อยู่ห้องเดียวกัน | trigger เท่านั้น | ตัวเอง | — (ลบตาม auth.users) |
| rooms | สมาชิก | ผ่าน RPC `create_room` | owner | owner |
| room_members | สมาชิกห้องเดียวกัน | ผ่าน RPC `create_room`/`join_room` | — | owner (ห้ามลบแถว owner) |
| memories | สมาชิก | สมาชิก, `author_id = auth.uid()` | author | author |
| memory_media | สมาชิก | author ของ memory | author | author |
| tags | สมาชิก | สมาชิก | สมาชิก | owner |
| memory_tags | สมาชิก | author ของ memory | — | author ของ memory |

`invite_code` อ่านได้เฉพาะสมาชิก; คนนอกใช้ได้แค่ผ่าน `join_room`

**Storage `memory-media` (private):** path segment แรก = `room_id`; read ได้เมื่อ `is_room_member(room_id)`, write/delete เมื่อเป็น author ของ memory ใน segment ที่สอง

### 3.4 Functions / triggers ที่ application คาดหวัง

| ชื่อ | ใช้โดย | พฤติกรรม |
| --- | --- | --- |
| `handle_new_user()` trigger บน `auth.users` | Sign up (R4) | insert `profiles(id, display_name)` จาก `raw_user_meta_data->>'display_name'` (fallback: ส่วนหน้า @ ของอีเมล) |
| `create_room(name, life_period, description, theme)` | `createRoom` (R9) | สร้าง room + สุ่ม invite_code + owner membership ใน transaction เดียว |
| `join_room(code)` | `joinRoom` (R9) | normalize uppercase → ไม่พบ = `INVALID_INVITE_CODE`; เป็นสมาชิกแล้ว = คืน room เดิม; ครบ 2 = `ROOM_FULL`; ใช้ `select ... for update` บน room กัน race |
| `set_updated_at()` trigger | ทุกตารางที่มี `updated_at` | อัปเดตเวลาอัตโนมัติ |

RPC ควร `raise exception` ด้วยข้อความที่ data layer map เป็น `AppErrorCode` ได้ตรงตัว เช่น `ROOM_FULL`, `INVALID_INVITE_CODE`

### 3.5 Draft SQL (ตัวอย่างสำหรับ profiles + trigger)

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

ตารางอื่นให้ซีเขียนเป็น migration ใน `supabase/migrations/` ตาม 3.2–3.4 แล้ว generate types (`supabase gen types typescript`) เก็บใน repo
