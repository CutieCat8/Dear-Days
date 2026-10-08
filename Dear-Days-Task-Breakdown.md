# Dear Days — Task Breakdown

เอกสารนี้แจกแจงงาน MVP ของ **Dear Days** เป็นงาน T1–T22 โดยระบุผู้รับผิดชอบ สิ่งที่ต้องทำ เงื่อนไขส่งมอบ และงานที่ต้องรอก่อน ใช้คู่กับ [Dear-Days-Project-Proposal.md](./Dear-Days-Project-Proposal.md)

## วิธีใช้และกติกาการทำงาน

- ติ๊ก `[x]` เมื่อทำครบตามเงื่อนไขส่งมอบของ task นั้นแล้ว; ถ้ายังไม่ครบให้คง `[ ]` ไว้
- “เริ่มได้เมื่อ” คือ dependency ที่ต้องมีอย่างน้อยก่อนเริ่มงานส่วนนั้น งาน UI ที่ระบุว่าใช้ mock data ให้เริ่มได้เลย ไม่ต้องรอ backend เสร็จ
- ก่อนเขียนโค้ดร่วมกัน ให้ทุกคนตกลง route, ชื่อ field, รูปแบบข้อมูล และ component/function contract ใน T1 แล้วบันทึกไว้ใน repo
- ทำงานแยก branch/commit ตาม task และแจ้งทีมเมื่อมีการเปลี่ยน contract ที่กระทบคนอื่น
- ฟีเจอร์สมาชิกห้องใน MVP จำกัดเจ้าของห้องกับสมาชิกที่เชิญอีก 1 คน; ไม่ทำ realtime, social feed หรือ 3D เต็มรูปแบบ

## ลำดับงานทั้งหมด

### T1 — ตกลงขอบเขตและ data/UI contract

- **ผู้รับผิดชอบ:** ทุกคน (ผู้ประสานงาน: ซี)
- **ฟีเจอร์:** ข้อตกลงร่วมก่อนแยกทำงาน
- **เริ่มได้เมื่อ:** เริ่มได้ทันที
- **To-do:**
  - [ ] ยืนยัน routes จาก proposal และแบ่งว่าใครเป็นเจ้าของหน้า/ส่วนประกอบใด
  - [ ] กำหนด field ของ `Memory`: `id`, `room_id`, `author_id`, `title`, `body`, `memory_date`, `mood`, `period_label`, `cover_media_id`, timestamps
  - [ ] กำหนด `mood` เป็น nullable และรับได้เพียง `awful`, `stressed`, `sad`, `relaxed`, `happy`, `excited` (แสดงไทย: แย่, เครียด, เศร้า, ชิลๆ สบายๆ, แฮปปี้, ตื่นเต้น)
  - [ ] ตกลง shape ของ `Room`, `MemoryMedia`, `Tag` และรูปแบบผลลัพธ์/ข้อผิดพลาดของ data functions
  - [ ] ตกลงวิธีแนบหลายรูป, ลำดับรูป, รูปปก และข้อจำกัดไฟล์เบื้องต้น
  - [ ] ตกลงวิธีส่งข้อมูล mock ให้หน้า UI ทำงานก่อน backend พร้อม
- **ส่งมอบเมื่อ:** ทุกคนมี contract ชุดเดียวกันในไฟล์/โฟลเดอร์ที่ทีมเข้าถึงได้ และเริ่มทำ UI/backend แยกกันได้

### T2 — ตั้งโปรเจกต์และโครงสร้างร่วม

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** Next.js + TypeScript project foundation
- **เริ่มได้เมื่อ:** T1
- **To-do:**
  - [ ] สร้าง/ตรวจ Next.js App Router + TypeScript strict และยืนยันคำสั่ง `npm run dev`, `npm run build`
  - [ ] ติดตั้งและตั้ง Tailwind CSS, React Hook Form, Zod และ Supabase client ตาม proposal
  - [ ] สร้างโครง route/component/lib ที่ทุกคนตกลงกัน โดยยังไม่ยัด logic ทั้งหมดไว้ในหน้าเดียว
  - [ ] เพิ่ม `.env.example` เฉพาะชื่อ env ที่จำเป็น ห้าม commit secret หรือ service-role key
  - [ ] เพิ่ม loading, not-found และ error boundary ขั้นพื้นฐานสำหรับ routes หลัก
  - [ ] เชิญเพื่อนเข้าถึง repo และยืนยันว่าทุกคน checkout แล้วรันโปรเจกต์ได้
- **ส่งมอบเมื่อ:** ทั้งสามคนรันโปรเจกต์ได้และ build ผ่านจากเครื่องตนเอง

### T3 — Supabase schema, Storage และ RLS

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** ฐานข้อมูลและความเป็นส่วนตัว
- **เริ่มได้เมื่อ:** T1; ทำคู่ขนานกับ T2 ได้
- **To-do:**
  - [ ] สร้างตาราง `profiles`, `rooms`, `room_members`, `memories`, `memory_media`, `tags`, `memory_tags` ตาม proposal
  - [ ] เพิ่ม foreign keys, unique constraints และ index ที่จำเป็น เช่น invite code และการค้นหา memory ในห้อง
  - [ ] กำหนด constraint/validation ให้ `mood` รับเฉพาะ 6 ค่าที่ตกลง หรือเป็น `NULL`
  - [ ] สร้าง private Storage bucket สำหรับรูปและกำหนด path แยกตามห้อง/โพสต์
  - [ ] เขียน RLS ให้เฉพาะสมาชิกอ่านข้อมูลห้อง/ไดอารี่ได้ และผู้เขียนแก้/ลบไดอารี่ตนเองได้
  - [ ] จำกัดการแก้ชื่อ/ธีมห้องและการจัดการสมาชิกให้เจ้าของห้อง
  - [ ] กำหนด Storage policy ไม่ให้ non-member เปิดรูป private ได้
  - [ ] เก็บ schema/migration/policy ใน repo เพื่อให้ทีมสร้างซ้ำได้
- **ส่งมอบเมื่อ:** schema ใช้ได้กับ Supabase project และทดสอบสิทธิ์ member/non-member เบื้องต้นแล้ว

### T4 — Types, validation และ mock fixtures

- **ผู้รับผิดชอบ:** ซี (types/data shape), จิรวัฒน์และสิรวิชญ์ (ตรวจความต้องการ UI)
- **ฟีเจอร์:** จุดเชื่อมระหว่าง backend กับ UI
- **เริ่มได้เมื่อ:** T1; ไม่ต้องรอ T3 เสร็จทั้งหมด
- **To-do:**
  - [ ] เพิ่ม TypeScript types สำหรับ `Room`, `Memory`, `MemoryMedia`, `Tag` และ mood union
  - [ ] เพิ่ม Zod schemas สำหรับ room, diary input, mood, tags และ metadata รูป
  - [ ] ทำ mock fixtures ที่มีทั้งบันทึกข้อความอย่างเดียวและบันทึกที่มีหลายรูป
  - [ ] ทำ fixture ให้ครอบคลุม mood ทั้ง 6 ค่าและกรณีไม่เลือก mood
  - [ ] แชร์ตัวอย่าง input/output ของ create/update/list/detail ให้ Jirawat และ Sirivich ใช้ทันที
- **ส่งมอบเมื่อ:** UI ทั้งสองฝั่ง import type/fixtures ชุดกลางได้โดยไม่ต้องรอ API จริง

### T5 — Auth และ profile

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** สมัคร เข้าสู่ระบบ และ session
- **เริ่มได้เมื่อ:** T2 และ T3 เริ่มมี Supabase config/schema พื้นฐาน
- **To-do:**
  - [ ] สร้าง Supabase browser/server client ให้เหมาะกับ Next.js
  - [ ] ทำสมัครบัญชี, เข้าสู่ระบบ, ออกจากระบบ และอ่าน session ปัจจุบัน
  - [ ] บันทึก/โหลด `display_name` ใน profile ตามแนวทางที่ทีมเลือก
  - [ ] ป้องกัน routes ที่ต้อง login และแสดงสถานะ unauthenticated ที่เข้าใจง่าย
  - [ ] จัดการ loading, invalid credentials และข้อผิดพลาดจาก Supabase
- **ส่งมอบเมื่อ:** ผู้ใช้ทดสอบสมัคร/เข้าสู่ระบบได้และ session ใช้กับหน้า protected ได้

### T6 — หน้าแรกและ navigation

- **ผู้รับผิดชอบ:** สิรวิชญ์
- **ฟีเจอร์:** Home, เมนูหลัก และทางเข้าห้อง
- **เริ่มได้เมื่อ:** T2 และ T4 (เริ่มด้วย mock ได้)
- **To-do:**
  - [ ] ทำหน้า `/` ให้เห็นชื่อ Dear Days, ห้องของผู้ใช้ และปุ่มสร้าง/เข้าร่วมห้อง
  - [ ] ทำ navigation ที่ไปหน้า home, ห้อง, gallery และ sign in/out ตามสถานะ
  - [ ] แสดง empty state เมื่อยังไม่มีห้อง พร้อมปุ่มเริ่มสร้างห้อง
  - [ ] ทำ layout responsive สำหรับมือถือและ desktop
  - [ ] เริ่มจาก fixtures แล้วเปลี่ยนมาเรียก data function เมื่อ T9 พร้อม
- **ส่งมอบเมื่อ:** ผู้ใช้เข้าใจทางไปสร้างห้อง/เข้าห้องได้ และหน้าไม่พังบนมือถือ

### T7 — UI ฟอร์มสร้าง/แก้ไขห้อง

- **ผู้รับผิดชอบ:** สิรวิชญ์
- **ฟีเจอร์:** ตั้งชื่อและธีมห้อง
- **เริ่มได้เมื่อ:** T2, T4; ทำด้วย mock ได้ ไม่ต้องรอ T9
- **To-do:**
  - [ ] ทำฟอร์มสร้างห้องที่ `/rooms/new` มีชื่อ ช่วงชีวิต และธีมเบื้องต้น
  - [ ] ทำฟอร์มแก้ไข `/rooms/[roomId]/edit` ด้วยข้อมูลเดิม
  - [ ] ใส่ validation และข้อความผิดพลาดผ่าน Zod/contract กลาง
  - [ ] แสดงปุ่มบันทึก/ยกเลิกและสถานะกำลังบันทึก
  - [ ] เชื่อม create/update function หลัง T9 พร้อม
- **ส่งมอบเมื่อ:** สร้าง/แก้ชื่อและธีมห้องได้ผ่าน UI และแจ้งผลสำเร็จ/ผิดพลาด

### T8 — UI เข้าร่วมห้องด้วย invite code

- **ผู้รับผิดชอบ:** สิรวิชญ์
- **ฟีเจอร์:** เข้าร่วมห้องส่วนตัว
- **เริ่มได้เมื่อ:** T2, T4; ทำหน้าฟอร์มด้วย mock ได้ ไม่ต้องรอ T9
- **To-do:**
  - [ ] ทำหน้า `/rooms/join` พร้อม input invite code และ validation
  - [ ] แสดงผลเมื่อรหัสไม่ถูกต้อง/ห้องเต็ม/เข้าร่วมสำเร็จ
  - [ ] เชื่อม join function หลัง T9 พร้อม
  - [ ] ตรวจว่า UI อธิบายข้อจำกัด MVP ว่าห้องรองรับเจ้าของกับสมาชิกที่เชิญอีกหนึ่งคน
- **ส่งมอบเมื่อ:** สมาชิกกรอกรหัสแล้วได้ผลลัพธ์ชัดเจนและไปห้องที่เข้าร่วมได้

### T9 — Backend ห้องและ invite code

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** CRUD ห้อง, membership, join
- **เริ่มได้เมื่อ:** T3 และ T5; T6–T8 สามารถทำ UI ระหว่างรอ
- **To-do:**
  - [ ] ทำ data functions สำหรับ list/get/create/update room
  - [ ] สร้าง invite code ที่ไม่ซ้ำและไม่เปิดเผยข้อมูลเกินจำเป็น
  - [ ] ทำ join ด้วย invite code โดยป้องกันการเข้าร่วมหากมีสมาชิกครบตาม MVP
  - [ ] ตรวจสิทธิ์ owner/member ทุก mutation ฝั่ง server และให้ RLS เป็นแนวป้องกันอีกชั้น
  - [ ] ส่งข้อมูลห้องและ error codes ตาม contract T1/T4 ให้ทีม UI
- **ส่งมอบเมื่อ:** สร้างห้องและให้บัญชีที่สองเข้าร่วมได้จริง พร้อมปฏิเสธรหัสผิด/ห้องเต็ม

### T10 — UI Gallery และตัวกรอง

- **ผู้รับผิดชอบ:** สิรวิชญ์
- **ฟีเจอร์:** ค้นหา/กรองความทรงจำ
- **เริ่มได้เมื่อ:** T2 และ T4; ทำ UI และ interaction ด้วย fixtures ได้ทันที
- **To-do:**
  - [ ] ทำ `/rooms/[roomId]/gallery` เป็นรายการการ์ดที่อ่านเนื้อหาได้ ไม่เน้นรูปอย่างเดียว
  - [ ] เพิ่มช่องค้นหาข้อความตาม title/body ตามขอบเขตที่ทำทัน
  - [ ] เพิ่ม filter วันที่/ช่วงวันที่, mood, person tag และ place tag
  - [ ] แสดง mood label บนการ์ดเมื่อ memory มี mood และจัดการค่า null
  - [ ] เพิ่มปุ่มล้างตัวกรอง, no-result state และ empty state
  - [ ] เชื่อม list/filter query จริงหลัง T14 และ T16 พร้อม โดยไม่รื้อ UI ที่ทำด้วย mock
- **ส่งมอบเมื่อ:** ค้นหาและ filter ได้ร่วมกัน พร้อมแสดงผลเมื่อไม่พบรายการ

### T11 — UI เขียนและแก้ไขไดอารี่

- **ผู้รับผิดชอบ:** จิรวัฒน์
- **ฟีเจอร์:** ฟอร์มบันทึกเรื่องราว
- **เริ่มได้เมื่อ:** T2 และ T4; ทำงานด้วย mock ได้ ไม่ต้องรอ backend
- **To-do:**
  - [ ] ทำหน้า create/edit ตาม routes ใน proposal
  - [ ] ทำช่อง title/body ให้เขียนเล่าเหตุการณ์และความรู้สึกได้; รูปไม่ใช่ field บังคับ
  - [ ] ทำ date picker/input สำหรับวันที่ของความทรงจำ
  - [ ] ทำตัวเลือก mood แบบเลือกได้หนึ่งค่า หรือไม่เลือกก็ได้: `awful`, `stressed`, `sad`, `relaxed`, `happy`, `excited` พร้อม label ไทยตาม proposal
  - [ ] ตรวจว่าการ edit โหลดค่าที่บันทึกไว้และเปลี่ยน mood/ล้าง mood ได้
  - [ ] ใส่ validation, disabled/loading state และข้อความ error/success
- **ส่งมอบเมื่อ:** สร้าง/แก้บันทึกข้อความพร้อม mood ด้วย mock ได้ครบ รวม null mood

### T12 — UI เลือกและจัดการรูป

- **ผู้รับผิดชอบ:** จิรวัฒน์
- **ฟีเจอร์:** รูปหลายรูปและภาพปก
- **เริ่มได้เมื่อ:** T11 เริ่มมี form state; T4 สำหรับ media contract
- **To-do:**
  - [ ] เลือกหลายรูปจากเครื่องและแสดง preview
  - [ ] ลบรูปที่เลือกก่อนบันทึก และเรียงลำดับรูป
  - [ ] เลือกภาพปกจากรูปที่แนบ; หากไม่มีรูปให้ภาพปกเป็น null/ใช้ fallback visual
  - [ ] แสดง validation ไฟล์ผิดชนิดหรือเกินขนาดที่กำหนด
  - [ ] รองรับ edit โดยแยกรูปเดิมกับรูปใหม่และระบุรูปที่ต้องลบ
- **ส่งมอบเมื่อ:** จัดการรูปใน UI ได้ครบโดยยังไม่ต้องอัปโหลดจริง

### T13 — UI tags และหน้าอ่านรายละเอียด

- **ผู้รับผิดชอบ:** จิรวัฒน์
- **ฟีเจอร์:** อ่านรายละเอียด memory และแท็กคน/สถานที่
- **เริ่มได้เมื่อ:** T4 และ T11; ใช้ mock ได้
- **To-do:**
  - [ ] ทำหน้า/modal รายละเอียดที่อ่าน title, body, วันที่, mood, รูป และ tags ได้
  - [ ] แยก person tag กับ place tag และให้เพิ่ม/ลบชื่อแท็กในฟอร์มได้
  - [ ] จัดข้อความยาวให้อ่านง่าย และรองรับบันทึกที่ไม่มีรูป
  - [ ] เพิ่มปุ่ม edit/delete เฉพาะเมื่อผู้ใช้มีสิทธิ์ตามข้อมูลที่ส่งจาก server
  - [ ] เมื่อกดยืนยันลบ แสดง confirm และสถานะผลลัพธ์
- **ส่งมอบเมื่อ:** อ่านบันทึกได้ทั้งแบบข้อความล้วน/มีรูป และเห็น mood/tag ถูกต้อง

### T14 — Backend CRUD ไดอารี่และ query

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** บันทึก/โหลด/แก้ไข/ลบ diary data
- **เริ่มได้เมื่อ:** T3, T4, T5; จิรวัฒน์ทำ T11–T13 ด้วย mock ได้ระหว่างรอ
- **To-do:**
  - [ ] ทำ create/get/update/delete memory และตรวจ session/room membership ทุกครั้ง
  - [ ] validate title/body/date/mood/period ด้วย schema ที่ตกลง; ยอมรับ mood null หรือหนึ่งใน 6 ค่าเท่านั้น
  - [ ] คืนข้อมูลพร้อม media และ tags ตามรูปแบบที่ UI ต้องใช้
  - [ ] ทำ list memories ตาม room, เรียงวันที่ และรองรับ search/date/mood filters ที่จำเป็น
  - [ ] คืน error แบบสม่ำคงที่ เช่น unauthenticated, forbidden, not found, validation error
  - [ ] ทดสอบว่า user แก้/ลบได้เฉพาะ memory ของตน
- **ส่งมอบเมื่อ:** CRUD ผ่าน Supabase และ UI สามารถสลับจาก mock ไป data functions ได้

### T15 — Backend media upload และ cleanup

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** Supabase Storage รูปส่วนตัว
- **เริ่มได้เมื่อ:** T3, T5 และ T4 media contract
- **To-do:**
  - [ ] ทำ upload ไปยัง private bucket ด้วย path ที่ผูก room/memory/member อย่างปลอดภัย
  - [ ] ตรวจชนิดและขนาดไฟล์ก่อน upload ทั้งฝั่ง client และ policy/server ตามแนวทางที่เลือก
  - [ ] บันทึก `storage_path`, `alt_text`, `position` และ cover relation ในฐานข้อมูล
  - [ ] ทำวิธีอ่านรูปให้เฉพาะสมาชิกเข้าถึงได้ (เช่น signed URL อายุสั้นตามการออกแบบ)
  - [ ] จัดการ upload ล้มเหลว/บางไฟล์ล้มเหลว และลบไฟล์ orphan เมื่อยกเลิกหรือลบ memory
- **ส่งมอบเมื่อ:** สมาชิกเห็นรูปในห้องได้ ส่วน non-member เปิด URL/ไฟล์ไม่ได้

### T16 — Backend tags

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** person/place tags ต่อ memory
- **เริ่มได้เมื่อ:** T3, T4 และทำร่วมกับ T14 ได้
- **To-do:**
  - [ ] ทำ create/reuse tag ภายใน room โดยแยก type `person`/`place`
  - [ ] เชื่อมและถอด tag กับ memory โดยตรวจสมาชิกห้องและเจ้าของ memory
  - [ ] ป้องกัน tag ซ้ำในห้องตาม normalization ที่ทีมตกลง (เช่น trim ช่องว่าง)
  - [ ] ส่ง tags กลับใน detail/list และเปิดให้ query/filter ตาม tag ได้
- **ส่งมอบเมื่อ:** บันทึกและกรอง person/place tags ได้โดยไม่ข้ามขอบเขตห้อง

### T17 — ห้องพิพิธภัณฑ์ isometric 2.5D

- **ผู้รับผิดชอบ:** ซี
- **ฟีเจอร์:** ฉากห้องและการเปิด memory
- **เริ่มได้เมื่อ:** T2, T4; ทำฉาก/ตำแหน่งด้วย fixtures ได้ ไม่ต้องรอ CRUD
- **To-do:**
  - [ ] สร้างฉากมุมคงที่ด้วย CSS/SVG/ภาพประกอบ ไม่ใช้ 3D engine
  - [ ] วาง memory เป็นกรอบรูปเมื่อมีรูป หรือสมุด/การ์ดเมื่อไม่มีรูป
  - [ ] ให้แต่ละวัตถุมี accessible label และเปิด detail ของ memory ที่ตรงกันเมื่อคลิก/กดแป้นพิมพ์
  - [ ] แสดงสถานะห้องว่างและทางไปเพิ่ม memory
  - [ ] เชื่อมข้อมูลห้องและ memories จริงหลัง T9/T14/T15 พร้อม
  - [ ] บนจอเล็กให้ใช้ Gallery/Card layout ตาม proposal แทนฉากที่กดยาก
- **ส่งมอบเมื่อ:** ห้องแสดงข้อมูลจริงและเปิด memory ที่เลือกได้ทั้ง desktop และ mobile flow

### T18 — เชื่อมฟอร์มไดอารี่กับ CRUD จริง

- **ผู้รับผิดชอบ:** จิรวัฒน์ + ซี
- **ฟีเจอร์:** บันทึกข้อความ/mood/tags/media เข้าระบบ
- **เริ่มได้เมื่อ:** T11–T16 (UI และ endpoint/function contract พร้อมเป็นส่วนๆ)
- **To-do:**
  - [ ] แทน mock submit ด้วย create/update functions
  - [ ] กำหนดลำดับบันทึก record, upload media, media metadata, tags และ cover ให้รับมือ failure ได้
  - [ ] หลัง save สำเร็จไปหน้า detail หรือห้องตาม flow ที่ทีมตกลง
  - [ ] ทดสอบสร้างบันทึกแบบไม่มีรูป, มีหลายรูป, mood null และ mood แต่ละค่า
  - [ ] ทดสอบ edit แล้วคงรูปเดิม/เพิ่ม/ลบ/เปลี่ยนปกได้
- **ส่งมอบเมื่อ:** ข้อมูลจาก form โหลดกลับมาได้ถูกต้องหลัง refresh

### T19 — เชื่อม Home/Room/Join UI กับ backend

- **ผู้รับผิดชอบ:** สิรวิชญ์ + ซี
- **ฟีเจอร์:** เส้นทางสร้าง/เข้าร่วมห้องจริง
- **เริ่มได้เมื่อ:** T6–T9
- **To-do:**
  - [ ] เปลี่ยนหน้า home จาก fixtures ไป list rooms จริง
  - [ ] เชื่อม create/edit room, join code และ refresh/navigation หลังสำเร็จ
  - [ ] แสดง loading, empty, invalid code, permission denied และ room-full states
  - [ ] ตรวจว่า user ที่ยังไม่ login ถูกพาไป auth แล้วกลับมาทำ flow ต่อได้ถ้าทำทัน
- **ส่งมอบเมื่อ:** สองบัญชีสร้างห้องและเข้าห้องเดียวกันผ่าน invite code ได้จริง

### T20 — เชื่อม Gallery กับข้อมูลจริง

- **ผู้รับผิดชอบ:** สิรวิชญ์ + ซี
- **ฟีเจอร์:** search/filter end-to-end
- **เริ่มได้เมื่อ:** T10, T14, T16
- **To-do:**
  - [ ] เปลี่ยน gallery fixtures เป็น query จริงของห้องปัจจุบัน
  - [ ] เชื่อม filter วันที่, mood, person tag และ place tag ตาม query contract
  - [ ] ทดสอบ filter เดี่ยวและหลายตัวพร้อมกัน รวม mood null และไม่มีผลลัพธ์
  - [ ] คลิก card แล้วไป detail ของ memory ที่ถูกต้อง
- **ส่งมอบเมื่อ:** Gallery แสดงเฉพาะข้อมูลห้องที่เป็นสมาชิกและ filters ให้ผลถูกต้อง

### T21 — ตรวจ privacy, error และ responsive

- **ผู้รับผิดชอบ:** ทุกคน (ซีดู RLS/Storage, จิรวัฒน์ดู diary flow, สิรวิชญ์ดู navigation/Gallery)
- **ฟีเจอร์:** ความพร้อมของ MVP
- **เริ่มได้เมื่อ:** T18–T20 มี flow หลักเชื่อมแล้ว
- **To-do:**
  - [ ] ใช้บัญชี A/B ในห้องเดียวกันตรวจ create/read/edit/delete ตามสิทธิ์
  - [ ] ใช้บัญชี C ที่ไม่ใช่สมาชิกยืนยันว่าอ่านห้อง/ไดอารี่และเปิดรูป private ไม่ได้
  - [ ] ลอง invite code ผิด, ห้องเต็ม, upload fail, validation fail และ network/backend error
  - [ ] ตรวจหน้า home, room, form, detail และ Gallery บนมือถือและ desktop
  - [ ] ตรวจ keyboard focus/label ของ mood buttons, gallery filters และวัตถุในห้อง
  - [ ] แก้ error ที่ขัดขวาง flow หลักและบันทึกปัญหาที่เหลือ
- **ส่งมอบเมื่อ:** ไม่มี privacy issue หรือ error ที่ขวางการสาธิต use case หลัก

### T22 — Deploy และเตรียม demo

- **ผู้รับผิดชอบ:** ซี (deploy), ทุกคน (เนื้อหา demo)
- **ฟีเจอร์:** MVP พร้อมนำเสนอ
- **เริ่มได้เมื่อ:** T21 และ `npm run build` ผ่าน
- **To-do:**
  - [ ] ตั้ง production environment variables ใน Vercel โดยไม่ commit secret
  - [ ] ตั้ง Supabase redirect/auth URLs สำหรับ deployment
  - [ ] deploy และทดสอบ signup/login บน URL จริง
  - [ ] เตรียมบัญชี demo สองบัญชีและข้อมูลตัวอย่าง ทั้งข้อความล้วน/มีรูปและ mood ต่างกัน
  - [ ] ซ้อม flow: สร้างห้อง → เชิญอีกบัญชี → เขียน diary เลือก mood → เปิดในห้อง → filter ใน Gallery
  - [ ] เตรียมสไลด์อธิบายโจทย์ ผู้ใช้ เทคโนโลยี การแบ่งงาน ข้อจำกัด และสิ่งที่เรียนรู้
- **ส่งมอบเมื่อ:** URL demo ใช้ได้และทีมสาธิตตาม flow ได้โดยไม่ต้องแก้ config หน้างาน

## Dependency map แบบย่อ

```text
T1 Contract
 ├─ T2 Project setup ─┬─ T6 Home UI ───────┐
 │                    ├─ T7 Room form UI ──┤
 │                    ├─ T8 Join UI ───────┤
 │                    ├─ T10 Gallery UI ───┤
 │                    ├─ T11 Diary UI ─────┤  (ใช้ mock ได้ ไม่ต้องรอ backend)
 │                    └─ T17 Room scene ───┤
 ├─ T3 Schema/RLS ─ T5 Auth ─ T9 Room API ──┴─ T19 Connect room flow
 └─ T4 Types/mocks ────────────────┬──────────────┐
                                   ├─ T14 Diary API ─ T18 Connect diary
                                   ├─ T15 Media API ─┘
                                   └─ T16 Tags API ─ T20 Connect Gallery
 T21 QA/privacy ─ T22 Deploy/demo
```

## แผนทำงาน 4 วัน

| วัน | ซี — Full-stack/ห้อง | จิรวัฒน์ — Diary UI | สิรวิชญ์ — Home/Gallery |
| --- | --- | --- | --- |
| **Day 1** | T2, T3, T4 เริ่ม Auth และวาง data functions | T1, ทำ T11 ด้วย fixtures เริ่ม T12 | T1, ทำ T6–T8 และ T10 ด้วย fixtures |
| **Day 2** | จบ T5, T9, T14 เริ่ม T15/T16 | จบ T11–T13 ด้วย mock แล้วเริ่มเชื่อม T18 เมื่อ function พร้อม | จบ UI ห้อง/หน้าแรก/Join/Gallery และเชื่อม T19 บางส่วน |
| **Day 3** | จบ T15/T16, ทำ T17 และช่วย T18–T20 | เชื่อม CRUD/media/tags, ทดสอบ diary detail/edit | เชื่อม T19/T20, ทดสอบ search/filter จริง |
| **Day 4** | ช่วยแก้ integration, ตรวจ RLS/Storage, deploy | ทดสอบ diary/mood/media และแก้ UI/error | ทดสอบ responsive/navigation/Gallery; ทุกคนทำ T21/T22 |

## ลำดับลดขอบเขตถ้าเวลาไม่พอ

คง flow ที่แสดงแนวคิดหลักและความเป็นส่วนตัวไว้ก่อน: Auth → ห้องร่วม 2 คน → เขียน/อ่าน diary พร้อม mood → เปิดจากห้องหรือ Gallery → ตรวจว่า non-member เข้าไม่ได้ หากล่าช้าให้ลดรายละเอียดตกแต่ง isometric, จำกัดรูปต่อบันทึกชั่วคราว, หรือให้ filter ทำงาน client-side กับรายการที่โหลดแล้วก่อน อย่าตัด validation mood, การตรวจสิทธิ์ หรือการอ่านเรื่องราวใน diary

## Definition of Done ร่วม

- [ ] Task มี checklist ย่อยครบและเปลี่ยนเป็น `[x]` หลังทดสอบจริง
- [ ] ไม่มี secrets ใน repo และมีตัวอย่าง env ที่ตั้งค่าได้
- [ ] `npm run build` ผ่าน
- [ ] ผู้ใช้สองคนเข้าห้องเดียวกันและเห็น diary/mood เดียวกันได้
- [ ] บันทึกแบบข้อความล้วนและแบบมีรูปทำงานได้
- [ ] Gallery กรอง mood ได้ครบ 6 ค่า รวมทั้งแสดงผลเมื่อไม่ได้เลือก mood
- [ ] non-member อ่านข้อมูลส่วนตัวหรือเปิดรูปไม่ได้
- [ ] flow หลักใช้งานบนมือถือได้และพร้อม demo
