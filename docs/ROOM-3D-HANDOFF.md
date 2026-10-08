# Room 3D handoff (T17)

ผู้ทำ: ซี (ผ่าน Claude Code) · ส่งต่อให้: Codex · ยังไม่ push/deploy

เปลี่ยนขอบเขต T17 จาก CSS/SVG 2.5D เป็น **3D จริง** (Three.js + React Three Fiber + Drei) เฉพาะ `/rooms/[roomId]` — ซีอนุมัติแล้ว บันทึกใน Task Breakdown, Proposal, `CONTRACTS.md`, `UI-GUIDE.md`

## สถานะรอบที่ 2 (ปรับให้ใกล้ reference)

ทำแล้ว:
- **ไม่มีกรอบครอบฉาก**: canvas โปร่งใสบนพื้นหลัง cream ของหน้า; container (`.stage`) กำหนดขนาดเท่านั้น ไม่มี border/card/radius; หัวเรื่องและปุ่มหลักลอยทับพื้นที่ว่างเหนือห้อง
- **ห้อง 5 × 8 หน่วย (~1.6:1)** เพิ่มความยาวจริงของ geometry (ผนังซ้ายยาว, ผนังขวาสั้น) สเกลเฟอร์นิเจอร์/ความสูงผนังคงเดิม; กล้อง orthographic azimuth 45° elevation 30°
- **Framing**: `CameraRig` คำนวณ zoom ให้ห้องเต็มพื้นที่; เมื่อเปิดแผงจะหักความกว้างแผงและเลื่อนมุมมองอย่างนุ่มนวล (damped, `invalidate()` จนนิ่ง) เมื่อปิดแผงกลับเฟรมเดิม ไม่ remount canvas / ไม่โหลด texture ใหม่ (`Scene` เป็น `memo`, selection เปลี่ยนแค่ re-render กรอบ/สมุด)
- **Selected memory panel**: เริ่มที่ `selectedId = null` (ไม่มีแผง ไม่มีคอลัมน์ว่าง); กดกรอบ/สมุด → แผงลอยขวา 320–360px (ivory) มีหัวข้อ Selected memory, ก่อนหน้า/ถัดไป, ปิด X, Escape, รูป preview ใหญ่ (สมุด = ปก diary), ชื่อ serif, วันที่ + place, mood, excerpt, People/Places, ปุ่ม Open memory (sticky ท้ายแผง, ส่วนเนื้อหา scroll ได้); เลือกวัตถุอื่นแล้วแผงอัปเดตทันที; วัตถุที่เลือกมีกรอบทองบาง ๆ + picture light
- **Mock fixtures (แก้รอบที่ 3)**: ห้อง University Days (`10000000-…0001`, ห้องที่ Home/layout ลิงก์ไป) มี 18 memories ชุดเดียว — 15 มีรูป (JPEG ใน `public/mock/museum/`, memory "By the lake" มี 2 รูป) + 3 ข้อความล้วน; ข้อมูลอยู่ใน `src/lib/contracts/demo-museum.ts` และ `fixtures.ts` ใช้เป็น `mockMemories`/`mockTags` ตัวเดียว (ลบ memory เดิม 7 รายการและห้อง demo แยกออก); ห้อง scene, หัวหน้า ("18 memories"), gallery และ detail อ่านชุดเดียวกัน; id ไม่ซ้ำ ผ่าน schemas, mood ครบ 6 ค่า + null; ไม่เขียนลง Supabase; `npm run check:fixtures` ผ่าน (2 rooms, 8 tags, 18 memories)
- **ทุกกรอบ/สมุดผูก memory.id 1:1** ผ่าน `assignMemories()` (ตรวจด้วยสคริปต์: 15 frames + 3 diaries, 18 id ไม่ซ้ำ, ตรง fixtures); ช่องที่ไม่มี memory **ซ่อน** (ห้อง University Days เดิมจึงมีแค่ 3 กรอบ + 3 สมุด); เฟอร์นิเจอร์ไม่โต้ตอบ
- **ฉาก**: ตู้ยาวชิดผนังซ้าย (สมุด 3, กรอบตั้ง 2, โคมไฟ + point light อุ่น, ต้นเล็ก), โต๊ะ+ลิ้นชัก+กล้อง+หนังสือ+กรอบตั้งชิดผนังขวา, เก้าอี้ไม้เบาะ sage + ผ้าห่ม plaid + หมอน (หน้าขวา), โต๊ะกลมบนพรม sage, pouf 2 ใบ, side table + กระถาง, ต้นไม้ใหญ่หน้าซ้าย / ต้นสูงใกล้มุมหลัง / ต้นข้างตู้; gallery wall ผนังซ้าย 7 + ผนังขวา 5 ขนาดต่างกัน (ตรวจไม่ทับกันด้วยสคริปต์)
- **วัสดุ/แสง**: normal map ของไม้ (grain), ผ้า (weave) และผนังปูน; ใบไม้มี UV + เส้นใบ + ก้านใบ + ใบย่อย; แสง key นุ่ม (shadow 4096, radius) + fill เป็นกลาง + environment จาก Lightformer; ลดโทนเหลือง/ส้ม; ไม่มี bloom/blur
- **ต้นไม้นอกห้อง**: `OutsideFoliage` เป็นใบไม้ที่ไม่เห็น (colorWrite/depthWrite ปิด) ลอยระหว่างแสงกับห้อง ทอดเงาใบไม้ลงผนัง/พื้น/พื้นนอก; ground เป็น `ShadowMaterial` (วาดเฉพาะเงา จึงไม่เห็นขอบแผ่นรับเงา) + `ContactShadows` ใต้เฟอร์นิเจอร์
- Keyboard: ปุ่ม sr-only เลือก memory (Enter/Space) → แผง → Open memory; loading overlay "Preparing the room…" จน scene mount; WebGL/scene error → fallback ลิงก์ memory

## ไฟล์ที่เปลี่ยนรอบนี้

`src/components/features/museum/`: `museum-scene.tsx` (state/แผง), `museum-scene.module.css`, `museum-room.tsx` (header ลอยทับ stage) · `room-3d/`: `config.ts` (ห้อง/กล้อง/แสง), `slots.ts` (slots + assign + `visibleMemories`), `room-shell.tsx`, `furniture.tsx`, `plants.tsx` (+`OutsideFoliage`), `display-items.tsx`, `materials.ts`, `textures.ts`, `lighting.tsx`, `room-canvas.tsx` · `src/lib/contracts/demo-museum.ts` (ใหม่), `fixtures.ts` (รวม demo) · `public/mock/museum/*.jpg` + `CREDITS.md` · docs เดิม (T17 scope)

## Dependencies / assets / license

`three@0.186.1`, `@react-three/fiber@9.8.1`, `@react-three/drei@10.7.9`, dev `@types/three@0.186.0` — MIT
- รูปตัวอย่าง `public/mock/museum/photo-01..15.jpg` มาจาก Lorem Picsum (ภาพจาก Unsplash, Unsplash License) พร้อมชื่อผู้ถ่ายใน `public/mock/museum/CREDITS.md`
- ไม่ใช้ GLB/texture ภายนอก: ทุก texture/geometry สร้างด้วยโค้ด (ยังเป็นสไตล์ geometry ไม่ใช่ PBR scan)

## รอบที่ 6: ห้องยื่นใต้ aside + pan + tilt + cursor-anchored zoom (ล่าสุด)

**สาเหตุจริงที่ห้องไม่ยื่นใต้ aside**: ตรวจ DOM แล้ว CSS ถูกอยู่แล้ว — canvas กว้างเต็ม main (วัดได้ 1635px ที่ viewport 1920 และ aside เป็น `position:absolute` ใน parent เดียวกัน ไม่มี grid/padding/margin เว้นให้ aside) ปัญหาเป็นที่ **camera framing อย่างเดียว**: overview วางห้องกึ่งกลาง canvas และ fit จากความสูง ห้องจึงกว้างแค่ ~700px และขอบขวาไปแตะซ้ายของ aside เพียง ~45px (ที่ 1440) ตอนนี้ overview มี baseline offset ในแนวนอน (`overviewBaseOffset()` ใน `camera-controller.tsx`) ให้ขอบขวาห้องยื่นเลยขอบซ้าย aside 130px (clamp ให้ขอบซ้ายห่างขอบ canvas ≥24px) ตรวจแล้วที่ 1440×900 และ 1920×1080: aside เปิด/ปิดแล้วตำแหน่ง/ขนาดห้องเท่าเดิม, ห้องส่วนขวาอยู่ใต้ aside จริง, ขอบบนเห็นครบ (framing/zoom เดิม 88% ของความสูง)

**กล้อง (ผู้ควบคุมเดียว: `camera-controller.tsx`)** — state: `az, rel(zoom), pan(world vector), tilt` ของ overview และ `wallRel, wallPan` ของ wall focus; ลบ built-in controls ไม่มี (ไม่ได้ใช้ OrbitControls) จึงไม่มี zoom ซ้ำ
- **Pan**: Shift+ลากซ้าย หรือลากเมาส์ขวา (context menu ถูกกันเฉพาะบน canvas) และปุ่ม ← → (ครั้งละ 2% ของความกว้าง stage); ตอบสนองทันที ไม่มี inertia (ลากตามมือ, ปล่อยแล้วหยุดทันที); overview จำกัด ±10% ของความกว้าง stage จาก baseline (แปลงเป็น world units ด้วย zoom ปัจจุบัน; ช่วงขยายตาม zoom เพื่อให้พาจุดไกลมาใต้ cursor ได้) — ตรวจ: ลากเกิน → ค้างที่ 115px พอดี; เลื่อนทั้ง camera position และ target ไปด้วยกัน (camera orbit รอบ target ที่เลื่อนแล้ว) ไม่แตะ mesh/แสง
- **Tilt**: ปุ่ม "Tilt up" / "Reset tilt" ครั้งละ 2° ช่วง 0…+8° (elevation 30°→38°), settle ~170ms, reduced-motion = ทันที, ซ่อนใน wall focus; az ±30° เดิม, ไม่มี roll
- **Cursor-anchored zoom**: wheel/pinch ยึดตำแหน่ง pointer (NDC จาก bounding rect ของ canvas); กล้อง orthographic ทำให้ทุกจุดเลื่อนด้วย offset หน้าจอเท่ากัน จึงชดเชย target ด้วย `anchor·(1/zoomเดิม − 1/zoomใหม่)` ตามแกน right/up ของกล้อง (เท่ากับ ray-plane anchoring บนระนาบใดก็ได้: พื้นหรือผนัง) แล้ว clamp; ใช้ได้ทั้ง overview และ wall focus; ปุ่ม +/− ซูมที่กลางพื้นที่ที่ aside ไม่บัง; ช่วง zoom 0.8–2.2 เดิม ตรวจ: ซูมที่กรอบ hero แล้วกรอบยังอยู่ใต้ cursor (±2px), ซูมที่มุมซ้ายบนของผนังตรงแล้วมุมนั้นอยู่ใต้ cursor
- **Wall focus**: pan 2 แกน (Shift/ขวา-ลาก, ปุ่ม ← →) จำกัดเมื่อขอบผนังถึงกลาง view (ไม่หายจากจอทั้งหมด); มุมตั้งฉากคงที่ (el 0, az 90°/0°) ระหว่าง zoom/pan; Back to room คืน az/zoom/pan/tilt ก่อนเข้า focus (ตรวจแล้ว); Reset view คืน baseline (az, zoom, pan, tilt) พร้อมขอบบนครบ
- ปุ่มและ aside เป็น DOM แยกจาก canvas จึงไม่ส่ง event เข้าฉาก; wheel/drag ผูกกับ `<canvas>` เท่านั้น; drag >6px ไม่เป็นคลิก (R3F `event.delta`)
- UI: toolbar เพิ่ม ←/→, Tilt up, Reset tilt (ข้อความอังกฤษตาม UI เดิม) และ hint บรรทัดใหม่

ผลตรวจ (Edge, หน้าจริง viewport 1432×687; 1440×900 และ 1920×1080 ผ่าน iframe ขนาดจริงย่อสเกล): aside เปิด/ปิดไม่ทำให้ห้องกระโดด, ไม่มี horizontal overflow, พื้นหลัง canvas โปร่งใสกลืนกับหน้า (renderer alpha, ไม่มี `scene.background`, ground เป็น ShadowMaterial) ไม่เห็นรอยต่อ; Mobile (<1024px) ไม่แตะ (ยังใช้ card grid) แต่ **ไม่ได้เปิดดูซ้ำในรอบนี้**
Screenshots: `docs/screenshots/` (`overview-aside-closed|open-1432x687` เป็น viewport เดียวกัน, `viewport-{1440x900,1920x1080}-aside-{open,closed}`, `tilt-max-8deg`, `pan-clamped-10pct`, `cursor-zoom-overview`, `wall-focus-left`, `wall-focus-cursor-zoom-corner`)

ข้อจำกัด: Shift-drag / ขวา-ลาก / wheel ถูกทดสอบด้วย event สังเคราะห์ (dispatchEvent) เพราะเครื่องมือเบราว์เซอร์ไม่มี modifier สำหรับลาก; pinch/touch ยังไม่ได้ทดสอบกับอุปกรณ์จริง; Edge ที่ใช้ตรวจเรนเดอร์ช้า/ค้างได้เมื่อเปิดแท็บนาน (ต้องเปิดแท็บใหม่) — ควรวัดบน production build; ส่วนของหน้า My Rooms ไม่ได้เปลี่ยนในรอบนี้ (ตอบ 200 ปกติ)

## รอบที่ 5: ห้องใหญ่ + orbit/zoom + wall focus (ล่าสุด — แทนรอบที่ 4 เรื่อง framing)

**โครงสร้าง**
- Canvas ใช้พื้นที่ stage ทั้งหมดใต้ header (โปร่งใส ไม่มี Card); Selected memory เป็น HTML overlay ลอยทับ ไม่หักความกว้าง canvas — เปิด/ปิดแผงไม่ย่อ/เลื่อนกล้อง (ตรวจเทียบ screenshot แล้วตำแหน่งห้องเท่าเดิม; ห้องเข้าไปอยู่หลังแผงได้)
- `room-3d/camera-controller.tsx` (ใหม่): กล้อง orthographic เดียว 3 สถานะ `overview | wall-left | wall-right`, state/pose อยู่ใน ref, ขยับเฉพาะกล้อง (ไม่หมุน/สเกล geometry)
- `room-3d/config.ts`: `CAMERA` (orbitRangeDeg ±30°, zoom 0.8–2.2, overviewFill 0.88, focusMs 800, dragThresholdPx 6), `roomBounds()` (bounding box ตัวห้อง ไม่รวมเงา/ต้นไม้นอก), `ROOM_CENTER` (orbit target), `wallFocus(side)` (target/azimuth/ขนาดจาก world-space: ระนาบผนัง + normal + bounds)
- HTML controls ใน `museum-scene.tsx`: View left wall / View right wall (หรือ Back to room), − / +, Reset view, hint "Drag to rotate · Scroll to zoom"; เป็นปุ่มจริง keyboard ใช้ได้; `cameraRef` (CameraApi) ส่งผ่าน `RoomCanvas` prop `apiRef`

**Overview**: fit = min(0.88 × ความสูง stage / ความสูง bounds, (กว้าง−2·32px)/กว้าง bounds); elevation 30° ล็อก; ลากซ้าย/ขวาเปลี่ยน azimuth 45°±30° (damping `1−e^(−12dt)`), ไม่มี pan/roll; ตรวจที่ปลายสองด้าน (15° และ 75°) ยังเห็นด้านในห้องทั้งสองผนัง (ผนังด้านที่เฉียงขอบ ๆ แต่ไม่เห็นด้านหลัง/นอกผนัง) จึงคง ±30°; Reset view คืน az=45°, zoom=1
**Zoom**: wheel (เฉพาะ pointer บน canvas, `preventDefault` ใน listener ของ canvas เท่านั้น — aside/หน้าไม่ถูกดัก), pinch 2 นิ้ว (pointer events), ปุ่ม ±; ใช้ `camera.zoom` ช่วง 0.8–2.2 เท่าของ zoom ที่ fit; ไม่ reset เมื่อเลือก memory
**Wall focus**: คลิกผนังว่าง (ผนังต้องเป็นผิวทึบที่ใกล้ที่สุดใต้ pointer — raycast เองเทียบกับ scene จึงไม่ trigger เมื่อเฟอร์นิเจอร์/ต้นไม้บัง; ลากเกิน 6px ไม่นับ; memory objects `stopPropagation`) หรือปุ่ม → animation 800ms ease-in-out cubic ของ target/azimuth/elevation/zoom (zoom แบบ log) ไปยัง front elevation: กล้องอยู่ฝั่ง normal ที่ elevation 0 (az 90° = ผนังซ้าย, 0° = ผนังขวา) world-up คงเดิม กรอบจึงเป็นสี่เหลี่ยมตรง ไม่เฉียง; กล้องอยู่ห่าง 40 หน่วยตลอดจึงไม่ทะลุผนัง; ระหว่าง animation ละเว้น drag/wheel/คลิกผนัง; ใน focus ล็อก orbit แต่ zoom ได้; เลือก memory ได้โดยไม่ออกจากโหมด; ต้นไม้สูงที่บังรูปจะ fade/ซ่อน และผนัง+กรอบอีกด้านซึ่งเหลือเป็นเส้นบางจะถูกซ่อน แล้วคืนเมื่อกลับ; พื้นที่อ่านเว้นช่องของแผงขวาไว้เสมอ (จึงไม่ขยับเมื่อเปิดแผง); Back to room คืน az/zoom ที่ใช้ก่อนเข้า focus; Escape: ปิดแผงก่อน แล้วค่อยออกจาก focus; `prefers-reduced-motion` → ข้าม animation
**อื่น ๆ**: Canvas `camera` prop เป็นค่าคงที่ระดับ module (ถ้าเป็น object ใหม่ทุก render R3F จะสร้างกล้องใหม่ — เคยทำให้หน้าค้าง); `Ready/onImageError` เป็น `useCallback`

ผลตรวจจริง (Edge ผ่าน Chrome tools, หน้าจริง; viewport จริงของแท็บ 1432×734): overview ปิด/เปิดแผง, ลากสุดซ้าย/ขวา, wheel zoom 2.2×, Reset view, wall focus ซ้าย/ขวา (ทั้งปุ่มและคลิกผนัง), เลือก memory ใน focus, Escape สองขั้น, Back to room; 1366×768 / 1440×900 / 1920×1080 ตรวจด้วย iframe ขนาดจริง: ไม่มี horizontal overflow, ห้อง ≈86–90% ของความสูง stage และเห็นยอดผนัง/ขอบพื้นครบ, ไม่ทับ header; canvas resize ตาม stage โดยไม่ remount; console ไม่มี error (เหลือ warning `THREE.Clock` จาก R3F)
Screenshots: `docs/screenshots/` — `overview-panel-closed|open-1432x734`, `wall-focus-left|right|right-with-panel`, `orbit-limit-az15|az75`, `viewport-{1920x1080-overview,1366x768-panel-open,1440x900-overview}` (iframe ย่อสเกลตามอัตราส่วน)

ข้อจำกัด/ปัญหาที่เหลือ:
- ยังไม่ได้ทดสอบ pinch และ touch จริง (ใช้ pointer events แต่ไม่มีอุปกรณ์), ไม่ได้ทดสอบ keyboard เต็มลำดับ Tab
- ใน Edge ที่ใช้ตรวจ การเรนเดอร์หนัก (GPU ช้า): zoom 2.2× หรือโหลดครั้งแรกค้างหลายวินาที; คลิกแรกหลังโหลดเสร็จเคยไม่ถูกรับ 1 ครั้ง (ปุ่ม View right wall) — คาดว่าเพราะเฟรมค้าง ควรวัดบน production build/เครื่องจริง
- ผนังอีกด้านถูกซ่อน (ไม่ fade แบบ alpha) และเงาของต้นไม้ที่ซ่อนหายพร้อมกัน; ต้นไม้อื่น ๆ ที่อยู่หน้าผนังไม่ถูกซ่อน (ไม่บังกรอบจากการตรวจ)
- wall focus ผนังซ้ายยาว (8.2 หน่วย) ถูกจำกัดด้วยความกว้าง จึงมีที่ว่างแนวตั้งเหลือ
- ไม่ได้แก้ lighting/assets/backend ตามที่กำหนด

## รอบที่ 4: framing, gallery wall, เงา, รูป preview (ส่วน framing ถูกแทนที่ด้วยรอบที่ 5)

สาเหตุ/สิ่งที่แก้:
1. **ยอดผนังถูกตัด**: stage เดิมลอยทับ header (margin ลบ) และ framing คำนวณจากค่าคงที่ ไม่ได้วัด container จริง → ตอนนี้ header อยู่ในแถวของตัวเอง, stage คือ flex item ที่เหลือจากหน้าจอ (ไม่มี Card/border), `CameraRig` คำนวณ **bounding box ห้องใน camera space** (`roomBounds()` ใน `room-3d/config.ts`: ผนังรวมความหนา+cap, พื้น, plinth) แล้วแก้ทั้ง **zoom และ look-at** ให้พอดี free area = canvas − margin 32px − (panel + gap 20px เมื่อเปิด); animation ใช้ค่า occupied เดียวกันทุกเฟรมจึงไม่หลุดขอบ; resize ไม่ remount (ตรวจโดยเปลี่ยนขนาด iframe ระหว่างใช้งาน); ground shadow ที่เลยขอบซ้ายใช้ `mask-image` ไล่จางแทนขอบตัด
2. **Gallery wall**: slots ถูกนิยามเป็นข้อมูลกลางต่อผนัง (`LEFT_WALL`/`RIGHT_WALL` ใน `slots.ts`, พิกัด local ตามผนัง: `along`, `row`, `size`) 2 แถวร่วมเส้นกึ่งกลาง (y=2.9 / 1.95) แถวบน: portrait–hero–landscape–portrait gap 0.25, แถวล่าง 3 ใบเล็กสลับตำแหน่ง; ห่างยอดผนัง ≥0.3, ห่างกรอบอื่น ≥0.12 (สคริปต์ตรวจ: ไม่มีคู่ใดชิดกว่านี้); ยังคง 15 กรอบ + 3 สมุด ผูก memory.id เดิม
3. **ทิศทางเงา**: แสงที่ cast shadow มีดวงเดียวคือ key directional (`LIGHTS.key`); fill (directional), bounce และโคมเป็น light ไม่ cast shadow; ต้นไม้นอกห้องเดิมวางสุ่มในระนาบตั้งฉากแสง บางกลุ่มอยู่ต่ำ → เงาตกด้านหน้า/ขวาของห้อง (ดูเหมือนคนละทิศ) แก้เป็นวางแต่ละกลุ่มที่ `target + keyDir × 11` ให้เงาตกจุดเป้าหมายที่กำหนดใน world space (ผนังซ้าย/ขวา พื้นกลาง/หน้า พื้นนอกซ้าย/หลัง) ทุกกลุ่มจึงเป็น projection ของ key light เดียวกับเงาห้อง; ความเข้มเงาพื้นนอก 0.2→0.1; ปรับ shadow map 3072, contact shadows 1024
4. **รูป preview แตก/ไม่โหลด**: ใช้ resolver กลาง `museum/memory-cover.ts` (`resolveMemoryCover`) ทั้งฉาก 3D และแผง (URL เดียวกัน); ตรวจพบด้วยการไล่กด Next ใน browser จริงว่า `next/image` ใน panel เป็น **lazy** → รูปของรายการที่ 2–15 ไม่ถูกดึง (`complete=false`, `currentSrc=""`) หลังเปลี่ยน memory; แก้เป็น `loading="eager"` + `unoptimized` (ไฟล์ mock เล็กอยู่แล้ว และ signed URL ของ Supabase ยังไม่อยู่ใน `images.remotePatterns` ถ้าจะใช้ optimizer ต้องตั้งค่าก่อน) ผลหลังแก้: ครบ 15/15 รูปโหลดได้ (`naturalWidth>0`), 3 สมุดแสดงปก diary, href ตรง id 01–18; มี fallback สวย (ปก diary + ข้อความ "Photo could not be loaded") เมื่อ `onError`; ใน 3D ใช้ ArtSurface + ข้อความที่มุมซ้ายล่าง
5. **ค้าง/ช้าตอนเลือกวัตถุ**: การเพิ่ม/ลบ pointLight ตอนเลือกทำให้จำนวนแสงเปลี่ยนและทุก material ต้อง recompile (หน้าค้างหลายวินาทีใน Edge) → เปลี่ยนเป็น `SelectionLight` ดวงเดียวถาวร (intensity 0 เมื่อไม่เลือก) ตามตำแหน่งวัตถุที่เลือก

การตรวจ (CSS viewport จริงด้วยการฝังหน้าใน iframe ขนาดจริงแล้วย่อด้วย transform; ใช้ Edge ผ่าน Chrome tools): 1366×768, 1440×900, 1920×1080 ทั้งปิด/เปิดแผง ยอดผนังและขอบพื้นครบ ไม่ทับ header ไม่มี horizontal overflow (`scrollWidth ≤ clientWidth`), Escape ปิดแผงแล้วกลับเฟรมเต็ม; screenshot: `docs/screenshots/room-{1366x768,1440x900,1920x1080}-{closed,panel-open}.jpg` (ย่อขนาดตามอัตราส่วน iframe)

ข้อควรระวังที่พบ:
- โหลดครั้งแรกในโหมด dev ช้ามาก (~30–60 วินาทีใน Edge ที่ใช้ตรวจ: compile + สร้าง texture) ยังมี overlay "Preparing the room…"; ควรวัดบน production build และลดงานสร้าง texture
- ฉากเล็กลงกว่ารอบก่อนบนจอเตี้ย เพราะ framing แยกพื้นที่ header ตามที่กำหนด (ปรับ `CAMERA.marginPx` ได้)
- ยังไม่ได้ตรวจ touch / จอ <1024px จริง และกรณีรูปใน 3D โหลดพัง (ไม่ได้จำลอง)

## สาเหตุที่พบจริง (รอบที่ 3)

1. **3 กรอบ + 3 สมุด / 7 memories**: ห้องที่เปิดจากเมนูคือ University Days ซึ่งในโค้ดมี memory เดิม 7 รายการ (3 มีรูป, 4 ข้อความ → 3 กรอบ + 3 สมุด) ส่วนชุด 18 รายการอยู่ในห้อง demo แยก (`…0003`) ที่ไม่มีลิงก์เข้า — slots/filters/limit ถูกต้อง (`assignMemories` ได้ 15+3 เมื่อมี 18 รายการ ตรวจด้วยสคริปต์) ปัญหาอยู่ที่ data flow ของ fixtures ไม่ใช่การ render
2. **ภาพดำ**: รูปของ memory เดิมเป็น SVG ที่มีแค่ `viewBox` (`/mock/memory-*.svg`) browser รายงานขนาด 0 → texture ว่าง/ดำ; ชุดใหม่เป็น JPEG ทั้งหมด (fetch ทุกไฟล์ได้ 200, เห็นภาพครบ 15 กรอบ) — ไม่ได้ปรับแสง
3. รูปโหลดไม่สำเร็จ → กรอบแสดงภาพวาด placeholder และมีข้อความ "Some photos could not be loaded…" ที่มุมซ้ายล่างของ stage (`onImageError`)
- ไฟล์ `public/mock/memory-*.svg` ไม่ถูกใช้แล้ว (ยังไม่ได้ลบ)

## ผลตรวจจริง

- `npm run typecheck`, `npm run lint`, `npm run check:fixtures`, `npm run build` ผ่าน
- เปิด browser จริง (Chrome, dev server) ตรวจ: ห้องเรนเดอร์, ไม่เลือก (ไม่มีแผง), เลือกกรอบ (แผงถูก memory + ห้องเลื่อนเว้นแผง), เลือกสมุด (ปก diary), เลือกกรอบตั้งบนโต๊ะ → "Two dachshunds" → Open memory เปิด `/rooms/…0003/memories/…0015` ได้, Escape ปิดแผงและห้องกลับเฟรมเดิม; console ไม่มี error (มีแค่ warning `THREE.Clock deprecated` จากภายใน R3F)
- แก้บั๊กที่เห็นจากภาพจริง: ภาพในกรอบเป็นแถบ/ว่างเพราะ z-fighting ระหว่าง mat กับภาพ (เลื่อนภาพออก 0.007), rug แสดงเป็นสีครีมเพราะ UV ของ RoundedBox (เปลี่ยนเป็น plane), ปรับแสง/สีให้ลดส้ม
- Screenshot (viewport ~1528×698): `docs/screenshots/room-3d-closed.jpg`, `docs/screenshots/room-3d-frame-selected.jpg`

## ข้อจำกัด — ยังไม่ได้ยืนยัน

- **ไม่ได้ตรวจ 1440×900 / 1920×1080 / หน้าจอเล็กจริง**: resize_window ไม่เปลี่ยน viewport ของ screenshot (ได้ ~1528×698 เสมอ) — layout ใช้ `calc(100dvh - 6.5rem)` และ fit ตามขนาด canvas จึงควรตรวจเองที่ขนาดเหล่านั้น; บนจอ <1024px ใช้ card grid เดิม (ไม่โหลด three) ยังไม่ได้เปิดดูจริง
- **ยังไม่ตรง reference ทุกจุด**: เฟอร์นิเจอร์ยังเป็น geometry เรียบกว่าภาพ (เก้าอี้/โต๊ะ/หนังสือ), ผ้าพาด/พรมไม่ละเอียดเท่า, ไม่มีหน้าต่าง/แสงตกกระทบบนผนัง, เงาใบไม้บนผนังเห็นน้อย (ส่วนใหญ่ตกที่พื้นนอก), ห้องกินพื้นที่แนวนอน ~55–60% เพราะอัตราส่วนห้อง height-limited
- ไม่ได้ทดสอบ WebGL fallback (ปิด WebGL) และกรณีรูปโหลดไม่ได้ (มี boundary + ArtSurface แต่ยังไม่ได้เห็นจริง); ไม่ได้เทสต์ touch
- โหลดครั้งแรกใน dev ช้า (สร้าง canvas texture/normal map ฝั่ง CPU ~ไม่กี่วินาที) — ควร cache หรือลดขนาด texture
- ตำแหน่งเมาส์/hover บนกรอบตั้งขนาดเล็กโดนยาก; กรอบ/สมุดที่ถูกต้นไม้บังไม่ได้ตรวจทุกชิ้น
- Mobile bottom sheet ยังไม่ทำ: ใช้ flow เดิม (card grid → detail page)

## จุดเชื่อมต่อ

- Selection: `selectedId` อยู่ใน `museum-scene.tsx` → `RoomCanvas` (`selectedId`, `onSelect`, `panelOpen`)
- แผงขวา: `MemoryPanel` ใน `museum-scene.tsx` (HTML ล้วน อ่านจาก `Memory` ตาม contract)
- ข้อมูลจริง: scene รับ `Memory[]` เท่านั้น `assignMemories()` คือจุดเดียวที่แมป memory → slot; จำนวนวัตถุตามข้อมูลจริง ช่องว่างซ่อน (ถ้าต้องการ "Add memory slot" ให้เพิ่มใน `display-items.tsx` + `slots.ts`)
- Demo data: ลบ `demo-museum.ts` + บรรทัดที่รวมใน `fixtures.ts` + `public/mock/museum/` เมื่อเชื่อมข้อมูลจริง

## งานที่ Codex ควรทำต่อ

1. ตรวจ 1440×900, 1920×1080, <1024px จริง แล้วจูน `.stage` height, `CAMERA.fitWidth/fitHeight/fill`, ขนาด panel
2. จูนความละเอียดเฟอร์นิเจอร์/แสง/โทนสีเทียบ reference (เก้าอี้, หนังสือ, ผ้า, หน้าต่าง + light shaft, เงาใบไม้บนผนัง)
3. ลดเวลาสร้าง texture ครั้งแรก (cache/ขนาดเล็กลง/OffscreenCanvas) และลอง GLB/PBR ที่มี license เหมาะสม (บันทึกแหล่งที่มา)
4. ทดสอบ fallback WebGL, รูปโหลดไม่ได้, keyboard flow, bottom sheet มือถือ
5. เปลี่ยน `signed_url` จริงเมื่อต่อ Supabase และตัด demo data ออก
