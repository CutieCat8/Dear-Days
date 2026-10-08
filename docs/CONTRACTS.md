# Dear Days — Shared Contract (ข้อเสนอ v0.1)

สถานะ: **เสนอให้ทีมตรวจและยืนยันร่วมกัน** ก่อนถือว่า T1 เสร็จสมบูรณ์  
เจ้าของการประสาน contract: ซี  
แหล่งอ้างอิงที่ตรวจด้วยเครื่อง: `src/lib/contracts/schemas.ts` โดย TypeScript types derive จาก Zod schemas ใน `types.ts`

เอกสารนี้กำหนด boundary ที่ UI และ backend ใช้ร่วมกัน ไม่ใช่ schema ฐานข้อมูลฉบับสุดท้าย หากแก้ field, nullability, enum หรือ error ต้องแก้ Zod schema/fixture/เอกสารพร้อมกันและแจ้งเจ้าของหน้าที่ได้รับผลกระทบ

## Routes และเจ้าของ

| Route | งาน | เจ้าของ UI | Backend/integration |
| --- | --- | --- | --- |
| `/` | รายการห้องและ navigation | สิรวิชญ์ (T6) | ซีช่วย T19 |
| `/sign-up`, `/sign-in` | Auth และ profile | ซี (T5) | ซี |
| `/rooms/new` | สร้างห้อง | สิรวิชญ์ (T7) | ซี T9/T19 |
| `/rooms/[roomId]/edit` | แก้ห้อง | สิรวิชญ์ (T7) | ซี T9/T19 |
| `/rooms/join` | เข้าร่วมด้วย invite code | สิรวิชญ์ (T8) | ซี T9/T19 |
| `/rooms/[roomId]` | ห้องพิพิธภัณฑ์ 2.5D | ซี (T17) | ซี |
| `/rooms/[roomId]/memories/new` | สร้างไดอารี่ | จิรวัฒน์ (T11–T12) | ซี T14–T16, ช่วย T18 |
| `/rooms/[roomId]/memories/[memoryId]` | อ่านไดอารี่ | จิรวัฒน์ (T13) | ซี T14–T16, ช่วย T18 |
| `/rooms/[roomId]/memories/[memoryId]/edit` | แก้ไดอารี่ | จิรวัฒน์ (T11–T13) | ซี T14–T16, ช่วย T18 |
| `/rooms/[roomId]/gallery` | ค้นหา/กรอง | สิรวิชญ์ (T10) | ซี T14/T16, ช่วย T20 |

ไฟล์ route ที่มีในรอบนี้เป็น skeleton เท่านั้น เจ้าของแต่ละส่วนสามารถแทนเนื้อหาภายในหน้าได้ แต่ให้คง route และเรียกข้อมูลผ่าน `src/lib/data` แทนการ query Supabase ใน component โดยตรง

## Entity contracts

ชื่อ field ที่ข้าม data boundary ใช้ `snake_case` ให้ตรงกับ Supabase และลด mapping ระหว่างทีม

### Room

```ts
type Room = {
  id: string;                 // UUID
  owner_id: string;           // UUID
  name: string;               // 1..80
  life_period: string;        // 1..80
  theme: "sunrise" | "rose" | "night";
  invite_code: string;        // 8 ตัวอักษร
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
listRooms(): Promise<DataResult<Room[]>>
getRoom(roomId): Promise<DataResult<Room>>
createRoom(input): Promise<DataResult<Room>>
updateRoom(roomId, input): Promise<DataResult<Room>>
deleteRoom(roomId): Promise<DataResult<{ id: string }>>
joinRoom(inviteCode): Promise<DataResult<Room>>

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
3. invite code ยาว 8 ตัว; UI แสดงเป็น uppercase แต่ backend เป็นผู้สร้างและตรวจ uniqueness
4. title และ body บังคับมีข้อความ แต่ mood, รูป, period label และ tags ไม่บังคับ
5. จำกัด 8 รูป/บันทึก, 10 MiB/รูป และ JPEG/PNG/WebP เพื่อให้ทำ MVP ภายใน 4 วัน
6. `signed_url` เป็น field สำหรับอ่านเท่านั้นและอาจเป็น `null` เมื่อสร้าง URL ไม่สำเร็จ; ไม่เก็บลงฐานข้อมูล
7. pagination ใช้ page/offset ใน MVP เพื่อให้ UI ทำง่าย; เปลี่ยนเป็น cursor ภายหลังได้โดยถือเป็น contract change
8. filter tag หลายค่าใช้ OR ภายในประเภทเดียวกัน
9. `author_id` มาจาก session ฝั่ง server ไม่อยู่ใน `MemoryInput`
10. เอกสารนี้ยังไม่ได้รับการยืนยันจากจิรวัฒน์/สิรวิชญ์ และยังไม่ได้ตรวจ response จริงกับ Supabase

