# เริ่มทำงานต่อหลัง merge Supabase (สำหรับเพื่อนร่วมทีม)

`main` ตอนนี้รวมงาน R1 (contracts) กับการเชื่อม Supabase (Auth, Postgres + RLS, private Storage) แล้ว และ hosted project `bnukioggopvrnppxkkkk` apply migration ครบทั้ง 4 ไฟล์แล้ว โค้ด pull ไปทำงานต่อได้เลย แต่ต้องตั้งค่าบนเครื่องตัวเองก่อน เพราะไฟล์ env ไม่ได้อยู่ใน git

## 1. ดึงโค้ด

```bash
git fetch origin
git switch main
git pull --ff-only origin main
npm install
```

ถ้ามีงานค้างในเครื่อง (uncommitted หรืออยู่คนละ branch) ให้ commit หรือ `git stash` ก่อน เพราะ `main` เปลี่ยนไฟล์เยอะ (data layer, หน้าห้อง, auth, ฟอร์ม memory) ไฟล์ที่อาจชนกับงานของแต่ละคนอยู่ใน `docs/SUPABASE-HANDOFF.md` หัวข้อ "Files that overlap with friends' work"

ถ้าเป็นงานที่แตกจาก `main` เก่า ให้ merge `main` เข้า branch ของตัวเองก่อนทำต่อ ไม่ rebase ทับงานที่ push แล้ว

## 2. ตั้ง `.env.local`

```bash
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
```

ใส่ค่า (เป็นค่า public ทั้งหมด):

```
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://bnukioggopvrnppxkkkk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

- `publishable key` ขอจากซี หรือดูใน Supabase Dashboard > Project Settings > API Keys (ต้องได้รับเชิญเข้า project) ค่านี้ไม่ได้อยู่ใน repo
- ห้ามใส่ service-role/secret key หรือรหัสผ่านฐานข้อมูลในไฟล์ env ของแอป แอปไม่ใช้
- ห้าม commit `.env.local` (ถูก gitignore อยู่แล้ว) และห้ามใส่ key ลงในแชตกลุ่มหรือ issue
- ถ้าไม่ตั้งค่า แอปจะรันใน **mock mode** (ข้อมูลตัวอย่างแบบอ่านอย่างเดียว ไม่มี login) ถ้าตั้ง `NEXT_PUBLIC_DATA_MODE=supabase` แต่ค่าขาด จะขึ้น error ไม่ fallback เป็น mock
- เปลี่ยนค่า `NEXT_PUBLIC_*` แล้วต้อง restart `npm run dev`

## 3. รันแอป

```bash
npm run dev
```

เปิด `http://localhost:3000` เท่านั้น เพราะเป็น redirect URL ที่ตั้งไว้ใน Supabase Auth สำหรับลิงก์ยืนยันอีเมล (ถ้าใช้พอร์ตหรือโดเมนอื่น ลิงก์ยืนยันจะพาไปผิดที่)

ตรวจก่อน push:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

## 4. ระวังเรื่องข้อมูลบน hosted

- hosted ใช้ร่วมกันทั้งทีม บัญชีและห้องที่สร้างจะเห็นตรงกัน ใช้ข้อมูลทดสอบที่ตั้งชื่อชัดเจน (เช่น "test ...") และลบเฉพาะของที่ตัวเองสร้าง
- ห้ามรันสคริปต์ที่ reset หรือล้างฐานข้อมูลบน hosted ห้าม `db reset`
- Supabase ยังใช้ตัวส่งอีเมลเริ่มต้น ซึ่งจำกัดจำนวนต่อชั่วโมงต่ำมาก การสมัครหลายบัญชีติดกันจะชน "Too many attempts" ถ้าไม่ต้องใช้ hosted จริง ให้ใช้ local stack (ข้อ 5)
- อีเมลทดสอบต้องเป็นกล่องของตัวเองเท่านั้น ห้ามใช้อีเมลของคนอื่น (plus-address ของตัวเองใช้ได้ เช่น `ชื่อ+test1@gmail.com`)

## 5. ใช้ local stack แทน hosted (ทดสอบแยก ไม่กระทบข้อมูลทีม)

ต้องมี Docker

```bash
npx supabase start -x studio,imgproxy,vector,edge-runtime,logflare,mailpit,supavisor
npx supabase status -o env        # ดู API_URL และ ANON_KEY / PUBLISHABLE_KEY
```

ใส่ใน `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` และ key จาก `status` ใน local ปิด email confirmation ไว้แล้ว สมัครได้ทันที `npx supabase db reset` ใช้ได้เฉพาะ **local** เท่านั้น

ชุดทดสอบ:

```bash
npm run test:db            # migrations + RLS/RPC บน Postgres ใน Docker
npm run test:integration   # end-to-end กับ local stack (รันกับ local เท่านั้น; ตั้ง SUPABASE_URL และ SUPABASE_ANON_KEY)
```

รายละเอียดเต็ม: `docs/DATABASE-SETUP.md`

## 6. ถ้าต้องแก้ database

1. เขียน migration ไฟล์ใหม่ใน `supabase/migrations/` (ตั้งชื่อเรียงต่อจาก `20261010000300_...`) ห้ามแก้ไฟล์ที่ apply ไปแล้ว และห้ามแก้ schema ผ่าน Dashboard
2. ทดสอบกับ local: `npx supabase migration up --local` แล้ว `npm run test:db` และ `npm run test:integration` (เพิ่มเทสต์สำหรับสิทธิ์หรือ constraint ที่เพิ่ม)
3. `npm run gen:types` เพื่ออัปเดต `src/lib/supabase/database.types.ts`
4. เปิด PR แล้วให้**ซี**เป็นคน push ขึ้น hosted: `npx supabase db push --dry-run` ตรวจรายการ แล้วค่อย `npx supabase db push` (ต้อง `supabase login` + `supabase link` และใส่รหัส DB ในเทอร์มินัล ซึ่งไม่ได้อยู่ใน repo)
5. อัปเดต `docs/CONTRACTS.md` ถ้า contract เปลี่ยน และ migration ที่ยังไม่ apply บน hosted ต้องบันทึกไว้ให้ชัดว่าฟีเจอร์ไหนต้องรอ

## 7. กฎที่ใช้ทั้งทีม

- UI เรียกข้อมูลผ่าน `DearDaysDataSource` ใน `src/lib/data` เท่านั้น ห้าม query Supabase ตรงจาก component หรือหน้า
- bucket `memory-media` ต้องเป็น private เสมอ เก็บ `storage_path` ในฐานข้อมูล ไม่เก็บ URL
- ห้าม force push `main`

## 8. สิ่งที่ยังค้าง

- ทดสอบบน hosted กับสมาชิกคนที่สองจริง (นำสมาชิกออก, invite → join, คนนอกเข้าห้อง) และ email confirmation ครบวงจร
- เปิด leaked-password protection และตั้ง custom SMTP ใน Dashboard (ซีเป็นคนตั้ง)
- UI อัปโหลด avatar (มีแค่คอลัมน์), rate limit การเดา invite code, โหลด 3D บนมือถือ, deploy

สถานะละเอียดและรายการไฟล์ที่ทับกัน: `docs/SUPABASE-HANDOFF.md`
