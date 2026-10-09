# Dear Days — Shared Contract (ข้อเสนอ v0.2)

สถานะ: **v0.2 (R1) รอ review จากสิรวิชญ์ และรอซีอนุมัติ database fields** — เพิ่ม Profile, RoomMemberView, Room `description` และพฤติกรรม invite/join/remove member  
เจ้าของการประสาน contract: จิรวัฒน์ (application contracts) · ซี (database fields)  
แหล่งอ้างอิงที่ตรวจด้วยเครื่อง: `src/lib/contracts/schemas.ts` โดย TypeScript types derive จาก Zod schemas ใน `types.ts`

เอกสารนี้กำหนด boundary ที่ UI และ backend ใช้ร่วมกัน ไม่ใช่ schema ฐานข้อมูลฉบับสุดท้าย หากแก้ field, nullability, enum หรือ error ต้องแก้ Zod schema/fixture/เอกสารพร้อมกันและแจ้งเจ้าของหน้าที่ได้รับผลกระทบ

## Routes และเจ้าของ

| Route | งาน | เจ้าของ UI | Backend/integration |
| --- | --- | --- | --- |
ตามการแบ่งงานใน `docs/REVISED-TASK-BREAKDOWN.md`: ซีเป็นเจ้าของ schema, migrations, RLS และ Storage ของทุก route

| Route | งาน | เจ้าของ application/UI | Data layer |
| --- | --- | --- | --- |
| `/` | รายการห้องและ navigation | สิรวิชญ์ | สิรวิชญ์ (R11–R12) |
| `/sign-up`, `/sign-in` | Auth | จิรวัฒน์ | จิรวัฒน์ (R4) |
| `/profile` | Profile | จิรวัฒน์ | จิรวัฒน์ (R5) |
| `/rooms/new` | สร้างห้อง | สิรวิชญ์ | สิรวิชญ์ (R9, R11) |
| `/rooms/[roomId]/edit` | แก้ห้อง, สมาชิก, Add friend | สิรวิชญ์ | สิรวิชญ์ (R9–R11) |
| `/rooms/join` | เข้าร่วมด้วย invite code/link | สิรวิชญ์ | สิรวิชญ์ (R9–R10) |
| `/rooms/[roomId]` | ห้องพิพิธภัณฑ์ 3D (Three.js/R3F) | สิรวิชญ์ | สิรวิชญ์ (R12) |
| `/rooms/[roomId]/memories/new` | สร้างไดอารี่ | จิรวัฒน์ | จิรวัฒน์ (R6–R8) |
| `/rooms/[roomId]/memories/[memoryId]` | อ่านไดอารี่ | จิรวัฒน์ | จิรวัฒน์ (R6–R8) |
| `/rooms/[roomId]/memories/[memoryId]/edit` | แก้ไดอารี่ | จิรวัฒน์ | จิรวัฒน์ (R6–R8) |
| `/rooms/[roomId]/gallery` | ค้นหา/กรอง | สิรวิชญ์ | สิรวิชญ์ (R12) |

ไฟล์ route ที่มีในรอบนี้เป็น skeleton เท่านั้น เจ้าของแต่ละส่วนสามารถแทนเนื้อหาภายในหน้าได้ แต่ให้คง route และเรียกข้อมูลผ่าน `src/lib/data` แทนการ query Supabase ใน component โดยตรง

## Entity contracts

ชื่อ field ที่ข้าม data boundary ใช้ `snake_case` ให้ตรงกับ Supabase และลด mapping ระหว่างทีม

### Profile

```ts
type Profile = {
  id: string;                 // UUID เดียวกับ auth user id
  display_name: string;       // 1..50
  avatar_url: string | null;  // MVP ยังไม่มี upload avatar; UI ใช้ตัวอักษรแรกแทนเมื่อเป็น null
  created_at: string;
  updated_at: string;
};

type ProfileInput = {
  display_name: string;       // แก้ได้เฉพาะ profile ของตัวเอง
};
```

ทุก user ต้องมี profile หนึ่งแถว (สร้างตอนสมัคร — ซีกำหนดกลไกใน R2) Profile ไม่มี email; email อยู่ใน Supabase Auth เท่านั้นและไม่ส่งให้สมาชิกคนอื่น

### Room

```ts
type Room = {
  id: string;                 // UUID
  owner_id: string;           // UUID
  name: string;               // 1..80
  life_period: string;        // 1..80
  description: string | null; // 0..300, ไม่บังคับ
  theme: "sunrise" | "rose" | "night";
  invite_code: string;        // 8 ตัว A-Z/0-9 uppercase
  member_count: number;       // 1..2 ใน MVP
  created_at: string;         // ISO datetime
  updated_at: string;         // ISO datetime
};
```

### Membership

```ts
type RoomMembership = {
  room_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};
```

ห้องมี owner หนึ่งคนและสมาชิกทั้งหมดไม่เกิน 2 คน เจ้าของต้องมี membership role `owner` ด้วย

`RoomInput` คือ `{ name, life_period, description, theme }` โดย `description` ส่ง `null` เมื่อเว้นว่าง

### RoomMemberView

ข้อมูลสมาชิกที่ UI ใช้แสดงในห้อง/Members panel — รวม membership กับข้อมูล profile สาธารณะเท่านั้น

```ts
type RoomMemberView = {
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: "owner" | "member";
  joined_at: string;
};
```

ห้ามเพิ่ม email หรือข้อมูลบัญชีอื่นใน view นี้

### Friends (หน้า Friends & Rooms, `/rooms/join`)

ข้อเสนอเพิ่มจาก MVP เดิม: ระบบเพื่อนด้วย username ต้องให้ทีมยืนยันขอบเขต และให้ซี review/push migration `20261010000400_friends.sql`
การเป็นเพื่อน **ไม่** ให้สิทธิ์เข้าห้องหรืออ่าน memory การเข้าห้องยังต้องใช้ invite code เหมือนเดิม

```ts
// username: a-z 0-9 . _ (3..30) ขึ้นต้นและลงท้ายด้วยตัวอักษรหรือตัวเลข; input ตัดช่องว่าง, "@" ข้างหน้า และแปลงเป็นตัวเล็ก (usernameSchema)
type FriendView = {
  friendship_id: string; user_id: string;
  display_name: string; username: string; avatar_url: string | null;
  since: string;                         // ISO datetime ที่กลายเป็นเพื่อน
};
type FriendRequestView = Omit<FriendView, "since"> & {
  direction: "incoming" | "outgoing";    // incoming = เขาขอเรา, outgoing = เราขอเขา
  created_at: string;
};
type FriendsOverview = { friends: FriendView[]; incoming: FriendRequestView[]; outgoing: FriendRequestView[] };
```

| Function | กรณี | ผลลัพธ์ |
| --- | --- | --- |
| `listFriends()` | ไม่มี session | `UNAUTHENTICATED` |
| `sendFriendRequest(username)` | ไม่พบ username | `NOT_FOUND` |
| | username ของตัวเอง | `VALIDATION_ERROR` |
| | เป็นเพื่อนแล้ว หรือส่งคำขอไปแล้ว | `CONFLICT` |
| | อีกฝ่ายส่งคำขอมาก่อน | ยอมรับคำขอนั้นให้เลย `{ status: "accepted" }` |
| `respondFriendRequest(id, accept)` | ไม่ใช่ผู้รับของคำขอที่ยัง pending | `NOT_FOUND`; ปฏิเสธ = ลบคำขอ |
| `removeFriend(id)` | ไม่ใช่หนึ่งในสองคน | `NOT_FOUND`; ใช้ได้ทั้งเลิกเป็นเพื่อนและยกเลิกคำขอ |

ทุกบัญชีมี `profiles.username` (ระบบตั้งให้ตอนสมัคร แก้ได้ในหน้า Profile) และ `Account.username` ใช้แสดงให้เจ้าของเห็นเท่านั้น profile ของคนอื่นอ่านได้เมื่ออยู่ห้องเดียวกัน เป็นเพื่อนกัน หรือมีคำขอค้างระหว่างกัน

### Add friend: invite และ join

"Add friend" ใน MVP คือการเชิญสมาชิกอีก 1 คนเข้าห้องด้วย code/link (ระบบเพื่อนด้านบนเป็นส่วนเสริม ไม่ได้แทนการ join ด้วย code) และไม่ส่งอีเมล

- invite link รูปแบบ `/rooms/join?code=XXXXXXXX`; หน้า Join เติม code จาก query ให้อัตโนมัติ
- client และ server normalize code ด้วย `inviteCodeSchema` (trim + uppercase, 8 ตัว A-Z/0-9)
- backend สร้าง code แบบสุ่ม เดายาก และ unique; ถ้ามี regenerate/revoke ต้อง owner-only และ code เก่าใช้ไม่ได้ทันที

| กรณี | ผลลัพธ์ |
| --- | --- |
| ไม่มี session | `UNAUTHENTICATED` |
| รูปแบบ code ผิด | `VALIDATION_ERROR` |
| code ไม่พบหรือถูก revoke | `INVALID_INVITE_CODE` |
| ผู้ใช้เป็นสมาชิกห้องนี้อยู่แล้ว | `ok: true` คืน Room เดิม ไม่สร้าง membership ซ้ำ |
| ห้องมีสมาชิกครบ 2 คน | `ROOM_FULL` |
| สำเร็จ | `ok: true` คืน Room ที่ `member_count` อัปเดตแล้ว; UI พาไป `/rooms/[roomId]` |

การตรวจจำนวนสมาชิกและการสร้าง membership ต้องเป็น operation เดียวแบบ atomic (ซีเตรียม RPC/constraint ใน R2) เพื่อกันการ join พร้อมกันเกิน 2 คน

การนำสมาชิกออก (`removeRoomMember`):

| กรณี | ผลลัพธ์ |
| --- | --- |
| ผู้เรียกไม่ใช่ owner ของห้อง | `FORBIDDEN` |
| เป้าหมายคือ owner (รวม owner ลบตัวเอง) | `FORBIDDEN` — owner ออกจากห้องไม่ได้ ต้องลบห้องแทน |
| เป้าหมายไม่ใช่สมาชิกห้องนี้ | `NOT_FOUND` |
| สำเร็จ | `ok: true` คืน `{ user_id }` |

MVP ไม่มีปุ่มให้ member ออกจากห้องเอง

**การ implement จริง (Supabase):**
- `member_count` ไม่ใช่คอลัมน์ ได้จาก view `room_summaries`; `description` เก็บใน `rooms.description` (ค่าว่างเก็บเป็น `null`)
- สร้างห้องผ่าน RPC `create_room` (room + owner membership ใน transaction เดียว); เข้าห้องผ่าน RPC `join_room` (ล็อกแถวห้อง, join ซ้ำไม่เพิ่มซ้ำ) คืน `INVALID_INVITE_CODE` / `ROOM_FULL`
- Invite link: `/rooms/join?code=XXXXXXXX` เติม code ให้ แต่ไม่ join เอง ผู้ใช้กด Join; ถ้ายังไม่ login จะถูกพาไป `/sign-in?next=...` แล้วกลับมาที่ลิงก์เดิม
- `memory_media.storage_path` เก็บ path เท่านั้น (`{room_id}/{uploader_id}/{memory_id}/{file}`); `signed_url` สร้างตอนอ่านและหมดอายุใน 1 ชั่วโมง
- `Profile.id` คือ `profiles.user_id`; หน้า account ใช้ `Account = Profile + { email, bio }` (ไม่อยู่ใน contract)
- `removeRoomMember` ทำผ่าน RPC `remove_room_member` ตามตารางด้านบน; memory ที่สมาชิกที่ถูกนำออกเขียนไว้ยังอยู่ในห้อง
- Error mapping: ดู `src/lib/data/result.ts`

### Memory

```ts
type Mood = "awful" | "stressed" | "sad" | "relaxed" | "happy" | "excited";

type Memory = {
  id: string;
  room_id: string;
  author_id: string;
  title: string;              // 1..120
  body: string;               // 1..10,000
  memory_date: string;        // YYYY-MM-DD
  mood: Mood | null;          // ไม่บังคับเลือก
  period_label: string | null;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
  media: MemoryMedia[];       // [] ได้
  tags: Tag[];                // [] ได้
};
```

| mood | label ไทย |
| --- | --- |
| `awful` | แย่ |
| `stressed` | เครียด |
| `sad` | เศร้า |
| `relaxed` | ชิลๆ สบายๆ |
| `happy` | แฮปปี้ |
| `excited` | ตื่นเต้น |
| `null` | ไม่ได้เลือกมู้ด |

`cover_media_id` ต้องเป็น `id` ของรายการใน `media` เดียวกัน ถ้าไม่มีรูปต้องเป็น `null`

### MemoryMedia

```ts
type MemoryMedia = {
  id: string;
  memory_id: string;
  storage_path: string;       // private bucket path ไม่ใช่ public URL
  signed_url: string | null;  // URL ชั่วคราวที่ data layer เตรียมให้ UI
  alt_text: string;           // 0..300
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  position: number;           // เริ่ม 0, เรียงน้อยไปมาก
  created_at: string;
};
```

### Tag

```ts
type Tag = {
  id: string;
  room_id: string;
  type: "person" | "place";
  label: string;              // 1..50
  created_at: string;
};
```

Tag ทุกตัวอยู่ภายใน room; person เป็นข้อความ ไม่ผูกกับบัญชีผู้ใช้ภายนอก และ tag ที่แนบกับ Memory ต้องมี `room_id` เดียวกัน

## Data function contract

Interface หลักอยู่ที่ `src/lib/contracts/data-functions.ts` ชื่อและ signature ที่ UI ใช้คือ:

```ts
getCurrentProfile(): Promise<DataResult<Profile>>
updateProfile(input): Promise<DataResult<Profile>>

listRooms(): Promise<DataResult<Room[]>>
getRoom(roomId): Promise<DataResult<Room>>
createRoom(input): Promise<DataResult<Room>>
updateRoom(roomId, input): Promise<DataResult<Room>>
deleteRoom(roomId): Promise<DataResult<{ id: string }>>
joinRoom(inviteCode): Promise<DataResult<Room>>
listRoomMembers(roomId): Promise<DataResult<RoomMemberView[]>>        // owner ก่อน; non-member → FORBIDDEN
removeRoomMember(roomId, userId): Promise<DataResult<{ user_id: string }>>

listFriends(): Promise<DataResult<FriendsOverview>>
sendFriendRequest(username): Promise<DataResult<{ friendship_id: string; status: "pending" | "accepted" }>>
respondFriendRequest(friendshipId, accept): Promise<DataResult<{ friendship_id: string }>>
removeFriend(friendshipId): Promise<DataResult<{ friendship_id: string }>>

listMemories(params): Promise<DataResult<Paginated<Memory>>>
getMemory(roomId, memoryId): Promise<DataResult<Memory>>
createMemory(roomId, input, uploads): Promise<DataResult<Memory>>
updateMemory(roomId, memoryId, input, uploads): Promise<DataResult<Memory>>
deleteMemory(roomId, memoryId): Promise<DataResult<{ id: string }>>

listTags(roomId): Promise<DataResult<Tag[]>>
upsertTags(roomId, tags): Promise<DataResult<Tag[]>>
```

ทุก function คืน discriminated union และ UI ต้องตรวจ `ok` ก่อนอ่านค่า:

```ts
type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError };

type DataError = {
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" |
    "VALIDATION_ERROR" | "CONFLICT" | "ROOM_FULL" |
    "INVALID_INVITE_CODE" | "UPLOAD_FAILED" | "INTERNAL_ERROR";
  message: string;
  field_errors?: Record<string, string[]>;
  retryable?: boolean;
};
```

Backend ต้องตรวจ session, membership และ author/owner permissions เองเสมอ ไม่เชื่อ `room_id`, `author_id` หรือ role จาก browser และไม่ส่ง service-role key ไป client

## List/filter parameters

`MemoryListParams` รองรับ:

- `room_id` (required)
- `query?` ค้น title/body แบบ case-insensitive
- `date_from?`, `date_to?` แบบ inclusive `YYYY-MM-DD`
- `moods?: Array<Mood | null>`; ใส่ `null` เพื่อกรองบันทึกที่ไม่ได้เลือก mood
- `person_tag_ids?`, `place_tag_ids?` เป็น UUID arrays
- `period_label?`
- `page?` เริ่ม 1, default 1
- `page_size?` 1..50, default 20
- `sort?`: `memory_date_desc` (default), `memory_date_asc`, `updated_at_desc`

ผลลัพธ์เป็น `{ items, page, page_size, total, has_more }` การกรองหลายกลุ่มใช้ AND ระหว่างกลุ่ม และ OR ภายใน array กลุ่มเดียวกัน

## Media input: เดิม/ใหม่/ลบ/ลำดับ/ภาพปก

`MemoryInput.media` แยกเจตนาอย่างชัดเจน:

```ts
type MediaMutation = {
  existing: Array<{ id: string; alt_text: string }>;
  added: Array<{
    client_id: string;        // UUID ที่ client สร้างเพื่อจับคู่ไฟล์
    file_name: string;
    mime_type: "image/jpeg" | "image/png" | "image/webp";
    size_bytes: number;
    alt_text: string;
  }>;
  removed_media_ids: string[];
  order: Array<
    | { kind: "existing"; id: string }
    | { kind: "new"; client_id: string }
  >;
  cover:
    | { kind: "existing"; id: string }
    | { kind: "new"; client_id: string }
    | null;
};
```

ไฟล์ใหม่จริงส่งแยกเป็น `NewMediaUpload[]` โดยจับคู่ด้วย `client_id`; metadata ใน `added` ต้องตรงกับไฟล์ UI ต้องใส่ทุกรูปที่คงไว้/เพิ่มใหม่ใน `order` ครั้งเดียว รูปที่ถูกลบไม่อยู่ใน `existing`, `order` หรือ `cover` และการไม่มีรูปใช้ arrays ว่างกับ `cover: null`

ข้อจำกัดเริ่มต้น:

- สูงสุด 8 รูปต่อ Memory
- สูงสุด 10 MiB ต่อไฟล์
- รับ JPEG, PNG, WebP
- private bucket; UI ใช้ signed URL ไม่ประกอบ public URL เอง
- backend ตรวจ MIME/ขนาดซ้ำก่อนบันทึก metadata และ cleanup ไฟล์ orphan เมื่อ operation ล้มเหลว

## ตัวอย่าง import สำหรับ UI

```ts
import { MOOD_LABELS, memoryInputSchema, mockMemories } from "@/lib/contracts";
import type { MemoryInput, MemoryListParams } from "@/lib/contracts";

const cards = mockMemories;
const label = cards[0].mood ? MOOD_LABELS[cards[0].mood] : "ไม่ได้เลือกมู้ด";

const filters: MemoryListParams = {
  room_id: cards[0].room_id,
  moods: ["happy", null],
  page: 1,
  page_size: 20,
};

const parsed = memoryInputSchema.safeParse(formValues);
```

## Assumptions ที่ทีมต้องยืนยัน

1. ใช้ `snake_case` ตลอด data boundary แม้ prop ภายใน component จะใช้ camelCase ได้
2. MVP มี theme คงที่ 3 ค่า: `sunrise`, `rose`, `night`
3. invite code ยาว 8 ตัว A-Z/0-9; ทั้ง client และ server normalize เป็น uppercase แต่ backend เป็นผู้สร้างและตรวจ uniqueness
4. title และ body บังคับมีข้อความ แต่ mood, รูป, period label และ tags ไม่บังคับ
5. จำกัด 8 รูป/บันทึก, 10 MiB/รูป และ JPEG/PNG/WebP เพื่อให้ทำ MVP ภายใน 4 วัน
6. `signed_url` เป็น field สำหรับอ่านเท่านั้นและอาจเป็น `null` เมื่อสร้าง URL ไม่สำเร็จ; ไม่เก็บลงฐานข้อมูล
7. pagination ใช้ page/offset ใน MVP เพื่อให้ UI ทำง่าย; เปลี่ยนเป็น cursor ภายหลังได้โดยถือเป็น contract change
8. filter tag หลายค่าใช้ OR ภายในประเภทเดียวกัน
9. `author_id` มาจาก session ฝั่ง server ไม่อยู่ใน `MemoryInput`
10. Join ซ้ำโดยสมาชิกเดิมถือว่าสำเร็จ (idempotent) ไม่ใช่ error
11. Room `description` และ Profile `avatar_url` เป็น nullable; ต้องได้รับอนุมัติจากซีก่อนสร้างคอลัมน์ใน R2
12. v0.2 ยังไม่ได้รับการ review จากสิรวิชญ์/ซี และยังไม่ได้ตรวจ response จริงกับ Supabase

