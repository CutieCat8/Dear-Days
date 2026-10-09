# Dear Days

Next.js App Router สำหรับ MVP ไดอารี่ส่วนตัวของทีม BlackJackie ปัจจุบันมี UI ของ routes หลัก, shared contracts/fixtures และ Museum room แล้ว แต่ยังไม่เชื่อม Auth, database และ Storage ของ Supabase จริง

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

## การแบ่งงานรอบปัจจุบัน

- จิรวัฒน์: Auth/Profile และ application/data integration ของ Memory, Media และ Tags
- สิรวิชญ์: Room/Membership/Invite, Add friend/Join, Home/Gallery/Museum data integration และเตรียม release candidate
- ซี: ดูแล Supabase project, schema/migrations, RLS, Storage policies, production deployment/release และตรวจ UI รอบสุดท้ายหลัง feature freeze

รายละเอียดงานที่ยังเหลือ, dependencies และ acceptance criteria อยู่ที่ [docs/REVISED-TASK-BREAKDOWN.md](docs/REVISED-TASK-BREAKDOWN.md) เอกสารนี้เป็นแผนทำงานล่าสุดแทนการยึด owner จาก breakdown เดิม

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

Proposal และ task breakdown เดิมอยู่ที่ root เป็น `Dear-Days-Project-Proposal.md` และ `Dear-Days-Task-Breakdown.md`; เก็บไว้เป็นประวัติและใช้อ้างอิง scope ส่วนการมอบหมายงานปัจจุบันให้ยึด revised breakdown

## กติกา contract

`src/lib/contracts/schemas.ts` เป็นแหล่งอ้างอิงที่ runtime ตรวจได้ ส่วน types derive ใน `types.ts` อย่าสร้าง interface ของ entity ซ้ำใน feature folder เมื่อจำเป็นต้องเปลี่ยน field/nullability/enum ให้แก้ schema, fixture และ `docs/CONTRACTS.md` ในการเปลี่ยนชุดเดียวกันแล้วแจ้งเจ้าของหน้าที่เกี่ยวข้อง

ดูรายละเอียด routes, error shape, filters และ media mutation ได้ที่ [docs/CONTRACTS.md](docs/CONTRACTS.md)

แนวทาง design tokens, shared UI components และ responsive rule อยู่ที่ [docs/UI-GUIDE.md](docs/UI-GUIDE.md)

## สถานะ backend

UI ปัจจุบันส่วนใหญ่ยังอ่าน mock fixtures และ form หลายจุดยังเป็น no-op ยังไม่มี migrations/RLS/Storage policies, Auth/session จริง, CRUD/data adapter, end-to-end test หรือ deployment จึงต้องทำ R0–R15 ก่อนส่งให้ซีตรวจ UI ใน R16 และให้ซี deploy/release ใน R17
