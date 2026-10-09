# Dear Days — Revised MVP Task Breakdown

อัปเดตจากสถานะ repository วันที่ 9 ตุลาคม 2026 เอกสารนี้ใช้วางแผนงานที่ **ยังเหลือจริง** หลังจาก UI ถูกพัฒนาไปมากกว่าขอบเขตใน `Dear-Days-Task-Breakdown.md` ฉบับเดิม

## 1. การแบ่งบทบาทใหม่

| คน | บทบาทตั้งแต่รอบนี้ | ขอบเขตหลัก |
| --- | --- | --- |
| จิรวัฒน์ | Auth + Memory application owner | Auth, Profile, data adapter และ UI integration ของ Memory, Media และ Tags |
| สิรวิชญ์ | Room/Integration owner | Room/Membership/Invite data adapter, Home/Rooms/Join/Gallery/Museum data wiring และเตรียม release candidate |
| ซี | Project, Database, Deployment & Privacy owner + Final UI reviewer | Supabase project, migrations, schema, RLS, Storage policies, production environment, deployment, release approval และตรวจ UI หลัง feature freeze |

สิรวิชญ์เป็นผู้ดูแล integration branch และตัดสิน merge order จิรวัฒน์ดูแล application contracts ร่วมกับหน้าฝั่ง Memory ส่วนซีเป็นผู้อนุมัติการเปลี่ยน database field, migration, RLS และ Storage ทุกครั้ง

## 2. สิ่งที่มีอยู่แล้วใน repo

รายการนี้หมายถึง “มี source/UI แล้ว” ไม่ได้หมายความว่าเชื่อม Supabase จริงหรือผ่าน acceptance ของระบบแล้ว

- [x] Next.js App Router, TypeScript strict, Tailwind, lint/typecheck scripts และ lockfile
- [x] Routes หลัก, app shell, responsive navigation และ shared design tokens
- [x] Shared TypeScript types, Zod schemas, data-function interface และ mock fixtures
- [x] Mock fixtures ครอบคลุม mood 6 ค่า + `null`, ข้อความล้วน และหลายรูป
- [x] UI หน้า Sign in/Sign up แต่ submit ยังไม่ทำงาน
- [x] UI Home, My rooms, Profile, Create/Edit room และ Join room
- [x] UI New/Edit/Detail memory, media picker, mood และ tag controls
- [x] UI Gallery/calendar/filter ด้วย mock data
- [x] Museum room และฉาก 3D ใช้ mock data
- [x] Supabase browser/server client factory ขั้นพื้นฐาน
- [x] `npm run lint`, `npm run typecheck` และ `npm run check:fixtures` ผ่าน ณ วันที่จัดทำเอกสารนี้

สถานะ Git ขณะตรวจ: branch `main` นำ `origin/main` อยู่ 5 commits และยังมีไฟล์แก้ไข/ไฟล์ใหม่เกี่ยวกับ room theme preview ที่ต้องตรวจและ commit ก่อนแยก branch

## 3. สิ่งที่ยังไม่มีหรือยังไม่ทำงานจริง

- Supabase migrations/schema/indexes/triggers ยังไม่มีใน repo
- RLS และ Storage policies ยังไม่มี
- Auth form ยังไม่เรียก Supabase; ไม่มี session refresh/route protection/logout/reset password
- Profile ยังเป็น placeholder
- ไม่มี implementation ของ `DearDaysDataSource`; หน้ายังอ่าน fixtures โดยตรง
- Create/Edit/Delete room ยังไม่บันทึกข้อมูลจริง
- Add friend/invite/join room ยังไม่ทำงานจริง
- Create/Edit/Delete memory, tags และ media upload ยังไม่บันทึกข้อมูลจริง
- Private image signed URLs และ cleanup ไฟล์ยังไม่มี
- Gallery/Home/Museum/Detail ยังไม่อ่านข้อมูลจริง
- ยังไม่ได้ทดสอบสิทธิ์ owner/member/non-member กับ Supabase จริง
- ยังไม่ได้ทำ end-to-end smoke test และ production deployment

## 4. ขอบเขต “Add friend” สำหรับ MVP

คำว่า Add friend ในรอบนี้หมายถึง **เชิญสมาชิกอีก 1 คนเข้าห้อง** ไม่ใช่ระบบเพื่อนส่วนกลาง ไม่มี friend request list, follower, social graph หรือ feed

Flow ที่ต้องส่งมอบ:

1. เจ้าของห้องกด **Add friend** ในหน้า Edit room หรือ Members panel
2. ระบบแสดง invite code 8 ตัวและ invite link รูปแบบ `/rooms/join?code=XXXXXXXX`
3. เจ้าของกด Copy code, Copy link หรือใช้ native Share ถ้า browser รองรับ
4. ผู้รับเปิด Join room; code จาก URL ถูกกรอกให้อัตโนมัติ หรือกรอกเองได้
5. เมื่อกด Join ระบบตรวจ session, code, จำนวนสมาชิก และ membership เดิม
6. สำเร็จแล้วสร้าง membership และพาไป `/rooms/[roomId]`
7. ห้องเต็มต้องคืน `ROOM_FULL`; code ผิดคืน `INVALID_INVITE_CODE`; ผู้ที่อยู่ในห้องแล้วต้องไม่ถูกเพิ่มซ้ำ
8. เจ้าของเห็นสมาชิก 1/2 หรือ 2/2 คน และสามารถนำสมาชิกที่เชิญออกจากห้องได้

ไม่ส่งอีเมลเชิญใน MVP; link/code คือกลไกเชิญหลัก

## 5. Task breakdown ใหม่

### R0 — เก็บสถานะปัจจุบันและเตรียมการทำงานร่วมกัน

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** ทันที
- **งาน:**
  - [ ] ตรวจ diff ของ `room-form.tsx`, `room-cover.tsx` และ assets theme preview ที่ยังไม่ commit
  - [ ] แยก commit ปัจจุบันให้ชัดและ push ให้ remote ก่อนเริ่ม backend
  - [ ] ให้ทั้งสามคน pull commit เดียวกันและรัน install/lint/typecheck/check:fixtures
  - [ ] สร้าง branch `feature/database`, `feature/auth-memory` และ `feature/room-integration`
- **เสร็จเมื่อ:** working tree ตั้งต้นสะอาด, ทั้งสาม branch เริ่มจาก commit เดียวกัน และไม่มีไฟล์ของซีสูญหาย

### R1 — ปรับ contract สำหรับ Profile, session และสมาชิกห้อง

- **เจ้าของ:** จิรวัฒน์
- **ผู้ตรวจ:** สิรวิชญ์
- **ผู้อนุมัติ database fields:** ซี
- **เริ่มได้:** หลัง R0
- **งาน:**
  - [ ] เพิ่ม `Profile` และ input schemas ที่จำเป็น
  - [ ] เพิ่ม `RoomMemberView` สำหรับแสดงชื่อ/บทบาทโดยไม่เปิดข้อมูลส่วนตัวเกินจำเป็น
  - [ ] เพิ่ม data functions อย่างน้อย `getCurrentProfile`, `updateProfile`, `listRoomMembers`, `removeRoomMember`
  - [ ] กำหนดพฤติกรรม invite link, join ซ้ำ, room full และ owner ห้ามนำตัวเองออก
  - [ ] ตัดสินใจ field `description` ของ Room: เพิ่มเข้า contract/schema จริง หรือนำออกจาก form ก่อนเชื่อม backend
  - [ ] อัปเดต `docs/CONTRACTS.md`, TypeScript types และ Zod schemas พร้อมกัน
- **เสร็จเมื่อ:** ทั้งสองคน review contract แล้ว และ UI ไม่ต้องสร้าง type ซ้ำ

### R2 — Supabase project, migrations และ generated types

- **เจ้าของ:** ซี
- **ผู้ตรวจ:** จิรวัฒน์และสิรวิชญ์ตรวจว่า generated types ใช้กับ application contracts ได้
- **เริ่มได้:** หลัง R1
- **งาน:**
  - [ ] เตรียม Supabase project/env สำหรับ local และ hosted environment โดยไม่ commit secret
  - [ ] สร้าง migrations สำหรับ `profiles`, `rooms`, `room_members`, `memories`, `memory_media`, `tags`, `memory_tags`
  - [ ] เพิ่ม primary/foreign keys, unique constraints, check constraints และ indexes
  - [ ] จำกัดหนึ่งห้องให้มี owner 1 คนและสมาชิกทั้งหมดไม่เกิน 2 คนด้วย transaction/RPC ที่ปลอด race condition
  - [ ] สร้าง profile row เมื่อสมัครบัญชี หรือกำหนด flow สร้าง profile ที่เชื่อถือได้
  - [ ] generate Database types เก็บใน repo
  - [ ] บันทึกวิธี apply/rollback migration โดยห้ามแก้ production schema ผ่าน Dashboard โดยไม่เก็บ migration
- **เสร็จเมื่อ:** reset database จาก migrations ได้ และ schema ตรงกับ contracts

### R3 — RLS และ Storage security

- **เจ้าของ:** ซี
- **ผู้ช่วยตรวจ:** จิรวัฒน์และสิรวิชญ์ช่วยรัน flow จาก application ตาม domain ของตน
- **เริ่มได้:** หลัง R2
- **งาน:**
  - [ ] เปิด RLS ทุกตารางที่มีข้อมูลผู้ใช้
  - [ ] สมาชิกห้องอ่าน room/memory/media/tags ของห้องตนเองได้เท่านั้น
  - [ ] เจ้าของเท่านั้นที่แก้ข้อมูลห้อง จัดการ invite และนำสมาชิกออกได้
  - [ ] ผู้เขียนเท่านั้นที่แก้/ลบ memory ของตนเองได้ตาม proposal
  - [ ] สร้าง private Storage bucket และ path ที่ผูกกับ room/memory
  - [ ] Storage policy ป้องกัน non-member และป้องกันเขียนข้ามห้อง
  - [ ] ทดสอบ owner/member/non-member ด้วยบัญชีอย่างน้อย 3 บัญชี
  - [ ] กำหนดวิธี export/backup และลบข้อมูลห้อง/บัญชีสำหรับการใช้งานจริงระยะยาว
- **เสร็จเมื่อ:** มีผลทดสอบสิทธิ์จริง ไม่ใช่เพียง SQL รันผ่าน

### R4 — Auth, session และ route protection

- **เจ้าของ:** จิรวัฒน์
- **เริ่มได้:** หลัง R2; ทำคู่กับ R3 ได้
- **งาน:**
  - [ ] เชื่อม Sign up พร้อมสร้าง/อัปเดต display name
  - [ ] เชื่อม Sign in, Sign out และ error states
  - [ ] ทำ Forgot/Reset password ให้ปุ่มปัจจุบันใช้งานจริง หรือเอาข้อความหลอกออกจาก MVP
  - [ ] เพิ่ม session refresh ตามแนวทาง Next.js/Supabase SSR เวอร์ชันที่ติดตั้ง
  - [ ] ป้องกัน `(app)` routes จากผู้ไม่ login และป้องกัน auth pages จากผู้ login แล้ว
  - [ ] redirect กลับ path เดิมหลัง sign in เมื่อเหมาะสม
- **เสร็จเมื่อ:** refresh หน้าแล้วยังมี session, logout แล้วเข้า private route ไม่ได้ และไม่มี service-role key ฝั่ง browser

### R5 — Profile data integration

- **เจ้าของ:** จิรวัฒน์
- **เริ่มได้:** หลัง R4
- **งาน:**
  - [ ] เปลี่ยนชื่อ/avatar placeholder ใน app shell และ Profile เป็นข้อมูล session/profile
  - [ ] รองรับแก้ display name ตาม contract
  - [ ] แสดงจำนวน rooms/memories จากข้อมูลจริง
  - [ ] ทำ loading/error/empty states
- **เสร็จเมื่อ:** บัญชีสองบัญชีเห็น profile และสถิติของตนเองถูกต้อง

### R6 — Memory CRUD data layer

- **เจ้าของ:** จิรวัฒน์
- **เริ่มได้:** หลัง R2–R3
- **งาน:**
  - [ ] implement `listMemories`, `getMemory`, `createMemory`, `updateMemory`, `deleteMemory`
  - [ ] validate input ด้วย Zod ที่ server boundary
  - [ ] ใช้ user id จาก session เป็น `author_id`; ห้ามรับจาก browser
  - [ ] รองรับ mood 6 ค่าและ `null`
  - [ ] รองรับ memory ที่ไม่มีรูปและไม่มี tags
  - [ ] map Supabase errors เป็น `DataResult`/`DataError` ตาม contract
- **เสร็จเมื่อ:** CRUD ผ่านทั้งกรณีข้อความล้วน, mood null และกรณี forbidden

### R7 — Tags และ media lifecycle

- **เจ้าของ:** จิรวัฒน์
- **เริ่มได้:** หลัง R3 และทำคู่กับ R6 ได้
- **งาน:**
  - [ ] implement room-scoped person/place tags และ `upsertTags`
  - [ ] upload JPEG/PNG/WebP สูงสุด 8 รูป รูปละไม่เกิน 10 MiB
  - [ ] ตรวจ MIME/size ซ้ำฝั่ง server
  - [ ] รองรับ existing/added/removed/order/cover ตาม `MediaMutation`
  - [ ] สร้าง signed URLs สำหรับอ่าน private images
  - [ ] cleanup orphan uploads เมื่อ transaction ล้มเหลว และลบ Storage object เมื่อ media ถูกลบ
- **เสร็จเมื่อ:** create/edit memory หลายรูป, reorder, เปลี่ยน cover และลบรูปทำงานโดยไม่เหลือ orphan ที่ตรวจพบ

### R8 — เชื่อม Memory UI กับ backend

- **เจ้าของ:** จิรวัฒน์
- **เริ่มได้:** หลัง R6–R7
- **งาน:**
  - [ ] เชื่อม New/Edit Memory form กับ React Hook Form + Zod และ data layer
  - [ ] แสดง submitting, progress, field errors, retry และ success navigation
  - [ ] เชื่อม Detail page กับ `getMemory`
  - [ ] เพิ่ม delete confirmation และจัดการ unauthorized/not-found
  - [ ] ยืนยัน keyboard, mobile และไม่บังคับรูป/mood
- **เสร็จเมื่อ:** ผู้ใช้สร้าง อ่าน แก้ และลบ memory จริงได้ครบจาก UI

### R9 — Room, membership และ invite backend

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** หลัง R1–R3
- **งาน:**
  - [ ] implement `listRooms`, `getRoom`, `createRoom`, `updateRoom`, `deleteRoom`
  - [ ] สร้าง owner membership พร้อม room ใน operation เดียว
  - [ ] implement `joinRoom(inviteCode)` แบบ atomic และกันสมาชิกเกิน 2 คน
  - [ ] implement `listRoomMembers` และ `removeRoomMember`
  - [ ] ทำ invite code แบบสุ่ม เดายาก unique และ normalize uppercase
  - [ ] หากมี regenerate/revoke code ต้อง owner-only และ code เก่าใช้ไม่ได้
- **เสร็จเมื่อ:** owner + invited member ใช้ห้องร่วมกันได้, คนที่สามเข้าไม่ได้ และ non-member อ่านห้องไม่ได้

### R10 — Add friend และ Join room UI integration

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** หลัง R9
- **งาน:**
  - [ ] ทำปุ่ม Add friend ในหน้า Edit room/Members panel ให้เปิด invite panel/dialog
  - [ ] แสดง Copy code, Copy link และ Share เมื่อรองรับ
  - [ ] ให้ `/rooms/join?code=...` เติม code อัตโนมัติ
  - [ ] เชื่อม Join form กับ `joinRoom`
  - [ ] แสดง invalid code, room full, unauthenticated, already joined และ success states
  - [ ] แสดงสมาชิกจริงและปุ่ม Remove member เฉพาะ owner
  - [ ] ซ่อน/disable invite action เมื่อห้องเต็ม
- **เสร็จเมื่อ:** ทดสอบ flow จาก owner copy link ไปบัญชีที่สองแล้วเข้าห้องสำเร็จบน browser จริง

### R11 — เชื่อม Room forms และรายการห้อง

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** หลัง R9
- **งาน:**
  - [ ] เชื่อม Create/Edit room form กับ Zod และ data layer
  - [ ] เปลี่ยน Home/My rooms จาก fixtures เป็น `listRooms`
  - [ ] เชื่อม Delete room พร้อม confirmation และ owner check
  - [ ] แสดงชื่อ สมาชิก จำนวน memories และ theme จากข้อมูลจริง
  - [ ] รักษา loading/empty/error states และ mobile layout เดิม
- **เสร็จเมื่อ:** create/edit/delete/list rooms ทำงานจริง และสมาชิกเห็นเฉพาะห้องของตนเอง

### R12 — Gallery, Home และ Museum data integration

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** หลัง R6 และ R9; ไม่ต้องรอ R8 เสร็จทั้งหมด
- **งาน:**
  - [ ] เปลี่ยน Gallery เป็น `listMemories(MemoryListParams)`
  - [ ] เชื่อม search, date range, mood รวม `null`, person/place tags, sort และ pagination
  - [ ] เปลี่ยน Home recent memories/statistics จาก fixtures เป็นข้อมูลจริง
  - [ ] เปลี่ยน Museum room จาก fixtures เป็น room/memories จริง
  - [ ] ส่ง signed URLs จาก data layer ให้ cards, detail และ 3D scene
  - [ ] จำกัดจำนวนวัตถุใน 3D อย่างปลอดภัยและมีทางเข้า Gallery สำหรับรายการที่เกิน
- **เสร็จเมื่อ:** memory ใหม่ปรากฏใน Detail, Home, Gallery และ Museum โดยไม่แก้ fixtures

### R13 — App-wide loading, errors และ accessibility QA

- **เจ้าของ:** สิรวิชญ์
- **ผู้ช่วย:** จิรวัฒน์ตรวจ routes ที่ตนเป็นเจ้าของ
- **เริ่มได้:** หลัง R8 และ R12
- **งาน:**
  - [ ] ตรวจ loading/error/not-found/empty ของทุก route
  - [ ] ตรวจ keyboard navigation, focus visibility, dialog focus trap และ Escape
  - [ ] ตรวจ label/error association ของทุก form
  - [ ] ตรวจ touch target และ overflow ที่ 375, 768, 1440 และ 1920 px
  - [ ] ตรวจ broken images/signed URL expiration fallback
  - [ ] ไม่มี console error ระหว่าง happy path
- **เสร็จเมื่อ:** มี checklist และ screenshots/browser evidence สำหรับ routes หลัก

### R14 — Security และ regression checks

- **เจ้าของ database/security:** ซี
- **ผู้ทดสอบ application:** จิรวัฒน์สำหรับ Auth/Memory และสิรวิชญ์สำหรับ Room/Join/Gallery
- **เริ่มได้:** หลัง R3, R8, R12
- **งาน:**
  - [ ] ทดสอบแก้ `room_id`, `author_id`, memory id และ Storage path จาก browser
  - [ ] ทดสอบ non-member เปิด detail/image URL ไม่ได้
  - [ ] ทดสอบ member แก้ memory ของอีกคนไม่ได้
  - [ ] ทดสอบ room full และ join พร้อมกัน
  - [ ] ตรวจว่าไม่มี secret/service-role key ใน client bundle หรือ Git
  - [ ] รัน lint, typecheck, fixture check และ build จาก clean install
- **เสร็จเมื่อ:** ไม่มี critical authorization gap และ checks ผ่านจริงจากเครื่องที่ environment รองรับ

### R15 — Integration และ release candidate handoff

- **เจ้าของ:** สิรวิชญ์
- **เริ่มได้:** หลัง R13–R14
- **งาน:**
  - [ ] merge ตามลำดับ R1/R2/R3 → domain implementations → UI integration
  - [ ] แก้ conflict โดยรักษา contracts และ route interfaces
  - [ ] อัปเดต README setup, migrations, env และ deployment
  - [ ] บันทึกข้อจำกัดที่ยังเหลือและ demo accounts/process สำหรับวันนำเสนอ
  - [ ] ส่ง commit SHA/tag ของ release candidate ให้ซี พร้อมผล checks และ known issues
- **เสร็จเมื่อ:** release candidate ผ่าน checks จาก clean install และซีได้รับ handoff ที่ deploy ต่อได้โดยไม่ต้องเดาสถานะ

### R16 — Final UI review

- **เจ้าของ review:** ซี
- **ผู้แก้ตาม review:** เจ้าของ route — จิรวัฒน์หรือสิรวิชญ์
- **เริ่มได้:** หลัง R15 feature freeze เท่านั้น
- **งานของซี:**
  - [ ] ตรวจความสอดคล้องกับภาพที่ออกแบบไว้ โดยไม่เปลี่ยน contract หรือเพิ่ม feature ใหม่
  - [ ] ให้ feedback เป็นรายการ High/Medium/Low พร้อม screenshot/route
  - [ ] อนุมัติ visual consistency สำหรับ desktop/mobile
- **งานของเพื่อน:** แก้ feedback ใน route ที่ตนเป็นเจ้าของและรัน regression checks ซ้ำ
- **เสร็จเมื่อ:** ไม่มี High severity UI issue และทีมตกลง freeze release

### R17 — Production deployment และ release approval

- **เจ้าของ:** ซี
- **เริ่มได้:** หลัง R16 ผ่านและ release commit ถูก freeze
- **งาน:**
  - [ ] ตรวจ commit SHA/tag ที่จะ deploy และยืนยันว่าไม่มี uncommitted production change
  - [ ] เชื่อม Vercel/hosting กับ repository ภายใต้บัญชีเจ้าของโปรเจกต์
  - [ ] ตั้ง production env vars และ Supabase redirect URLs โดยไม่ commit secret
  - [ ] deploy preview ก่อน แล้วจึง promote/deploy production
  - [ ] ตรวจ build/runtime logs และ rollback เมื่อพบ blocker
  - [ ] ทดสอบ Sign up → Create room → Add friend → Join → Create memory → Gallery/Museum บน deployment จริงด้วยสองบัญชี
  - [ ] บันทึก production URL, deployed commit และวันเวลา release
- **เสร็จเมื่อ:** production URL ใช้งาน flow หลักได้จากสองบัญชี, ตรงกับ commit ที่อนุมัติ และ clean clone รันตาม README ได้

## 6. ลำดับทำงาน 4 วัน

### Day 1 — Contracts, database และ Auth base

- ซี: R2 และอนุมัติ database fields ใน R1
- จิรวัฒน์: R1 และเริ่ม R4
- สิรวิชญ์: R0, เตรียม room/membership implementation ของ R9 และ review R1
- เป้าหมายสิ้นวัน: schema reset ได้, login เริ่มทำงาน, contract invite/member ถูกล็อก

### Day 2 — Domain backend

- ซี: R3
- จิรวัฒน์: R4, R6, R7
- สิรวิชญ์: R9, R10 และ R11
- เป้าหมายสิ้นวัน: auth, room/join และ memory CRUD ทำงานระดับ data layer

### Day 3 — UI wiring

- ซี: support เฉพาะ migration/RLS/Storage defect ที่บล็อกเพื่อน; ยังไม่เริ่ม re-UI
- จิรวัฒน์: R5 และ R8
- สิรวิชญ์: R10–R12
- เป้าหมายสิ้นวัน: ไม่มีหน้าหลักอ่าน fixtures ใน production path

### Day 4 — Integration, UI approval and release

- ซี: R14 ด้าน database/security, R16 หลัง feature freeze และ R17 เมื่อ UI ผ่าน
- จิรวัฒน์: ทดสอบ R14 ฝั่ง Auth/Memory และแก้ defects
- สิรวิชญ์: R13, R15 และแก้ room/gallery defects ตาม final review
- เป้าหมายสิ้นวัน: deploy และ demo flow สองบัญชีผ่าน

## 7. กติกาป้องกันงานชนกัน

- ซีเป็นเจ้าของ Supabase project, schema, migrations, database functions/RPC, RLS, Storage buckets/policies, generated database types, hosting, production environment และ deployment ทั้งหมด
- จิรวัฒน์เป็นเจ้าของ application code ของ `auth`, `profile`, `memory`, `media` และ `tags` แต่เสนอ schema change ให้ซีทำหรืออนุมัติก่อน
- สิรวิชญ์เป็นเจ้าของ application code ของ rooms, membership, invite/join, Home, Gallery, Museum wiring และ integration แต่เสนอ schema change ให้ซีทำหรืออนุมัติก่อน
- เฉพาะซีตั้งหรือเปลี่ยน production secrets, Supabase production settings, hosting configuration และ release deployment; เพื่อนส่งมอบ release candidate โดยไม่ต้องรับ credentials
- เพื่อนห้ามแก้ production schema หรือ policy ผ่าน Supabase Dashboard โดยตรง; database change ทุกครั้งต้องมี migration และ review โดยซี
- เปลี่ยน `docs/CONTRACTS.md` ต้องมี review จากอีกคนก่อน merge
- ห้าม query Supabase โดยตรงใน presentational component; ผ่าน `src/lib/data` หรือ server boundary
- ห้ามแก้ visual design ครั้งใหญ่ก่อน R16 เว้นแต่ UI ขัดขวางการใช้งานหรือ accessibility
- หนึ่ง task ต่อหนึ่ง commit ที่อธิบายได้; ห้ามรวม schema, UI redesign และ unrelated cleanup ใน commit เดียว
- อย่าติ๊ก task ที่ต้องใช้ Supabase จริงจนกว่าจะทดสอบกับบัญชี/ข้อมูลจริงตาม acceptance criteria

## 8. Definition of Done ของ MVP

- ผู้ใช้สมัคร, login, logout และกลับมาแล้วยังมี session ถูกต้อง
- เจ้าของสร้าง/แก้/ลบห้องและเชิญสมาชิกอีก 1 คนได้
- ผู้รับ join ผ่าน code/link ได้; คนที่สามเข้าไม่ได้
- สมาชิกเห็นเฉพาะห้องและรูป private ที่ตนมีสิทธิ์
- ผู้ใช้สร้าง/อ่าน/แก้/ลบ memory ของตนเองได้ โดยรูปและ mood ไม่บังคับ
- media หลายรูป, ลำดับ, cover และ tags person/place ทำงานจริง
- Home, Gallery, Detail และ Museum แสดงข้อมูล Supabase ชุดเดียวกัน
- responsive และ keyboard ใช้งาน flow หลักได้
- lint, typecheck, fixture check และ production build ผ่านจาก clean install
- deployment ผ่าน smoke test สองบัญชี และไม่มี secret ใน repository/client bundle

