# Dear Days

Next.js App Router foundation สำหรับ MVP ไดอารี่ส่วนตัวของทีม BlackJackie รอบแรกนี้ครอบคลุม T1 (contract ฉบับเสนอ), T2 ส่วนที่ทำใน repo ได้ และ T4 ส่วน types/schemas/fixtures โดยยังไม่เชื่อม Supabase project จริง

## เริ่มใช้งาน

ต้องใช้ Node.js 20.9+ และ npm

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` ค่า Supabase ใน `.env.local` จะจำเป็นเมื่อเริ่ม T5/T9; route skeleton และ fixtures รอบนี้รันได้โดยไม่ต้องมี project จริง ห้ามใส่ service-role key ในตัวแปร `NEXT_PUBLIC_*` หรือ commit `.env.local`

คำสั่งตรวจ:

```bash
npm run lint
npm run typecheck
npm run check:fixtures
npm run build
```

## จุดเริ่มงานของแต่ละคน

- จิรวัฒน์: หน้า `src/app/rooms/[roomId]/memories/**`, ใช้ `memoryInputSchema`, `MemoryInput`, `mockMemories` และ `mockMemoryCreateInput` จาก `@/lib/contracts`
- สิรวิชญ์: `src/app/page.tsx`, `src/app/rooms/new`, `src/app/rooms/join`, `src/app/rooms/[roomId]/gallery`; ใช้ `Room`, `roomInputSchema`, `MemoryListParams`, `mockRooms`, `mockMemories`
- ซี: `src/lib/supabase`, `src/lib/data`, auth routes, และ `src/app/rooms/[roomId]/page.tsx`

ทุกหน้าควรแยก presentation components ไปไว้ใต้ `src/components` และเรียก backend ผ่าน implementation ของ `DearDaysDataSource` ใต้ `src/lib/data` ห้าม query Supabase โดยตรงจาก presentational component

## โครงสร้างสำคัญ

```text
src/app/                 App Router routes, loading/error/not-found
src/components/layout/   layout/navigation ร่วม
src/components/shared/   component กลางที่ไม่ผูก data source
src/lib/contracts/       Zod schemas, derived types, function interface, fixtures
src/lib/data/            Supabase/mock data adapters (เริ่ม implement ใน T9/T14)
src/lib/supabase/        browser/server client factories
scripts/                 การตรวจ contract fixtures
docs/CONTRACTS.md        contract ฉบับเสนอและ assumptions
public/mock/             ภาพ fixture local
```

Proposal และ task breakdown ที่ได้รับมาอยู่ที่ root เป็น `Dear-Days-Project-Proposal.md` และ `Dear-Days-Task-Breakdown.md` (ไม่ได้อยู่ใต้ `docs/` ตาม path ที่แจ้ง) และไม่มี `AGENTS.md` ใน workspace ตอนเริ่มงาน

## กติกา contract

`src/lib/contracts/schemas.ts` เป็นแหล่งอ้างอิงที่ runtime ตรวจได้ ส่วน types derive ใน `types.ts` อย่าสร้าง interface ของ entity ซ้ำใน feature folder เมื่อจำเป็นต้องเปลี่ยน field/nullability/enum ให้แก้ schema, fixture และ `docs/CONTRACTS.md` ในการเปลี่ยนชุดเดียวกันแล้วแจ้งเจ้าของหน้าที่เกี่ยวข้อง

ดูรายละเอียด routes, error shape, filters และ media mutation ได้ที่ [docs/CONTRACTS.md](docs/CONTRACTS.md)

แนวทาง design tokens, shared UI components และ responsive rule อยู่ที่ [docs/UI-GUIDE.md](docs/UI-GUIDE.md)

## ขอบเขตรอบนี้

มีเพียง route skeleton สำหรับหน้าของเพื่อนเพื่อไม่ขวางการทำงานร่วมกัน ยังไม่มี Auth, database migration/RLS/Storage, CRUD จริง, Gallery UI เต็ม, diary form เต็ม หรือ deploy งานที่ต้องยืนยันจากเพื่อนและ Supabase จริงจึงยังไม่ถือว่าเสร็จ
