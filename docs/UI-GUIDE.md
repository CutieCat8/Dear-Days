# Dear Days — UI foundation

แนวทางนี้ต่อยอดจาก mobile Figma และ desktop PDF โดย contract/route ใน `CONTRACTS.md` มีลำดับสูงกว่า visual reference เสมอ

## Design direction

- Tone: อบอุ่น สงบ เป็นพื้นที่ส่วนตัว ไม่ใช่ social feed
- Display type: `var(--font-display)` สำหรับชื่อห้อง/ชื่อความทรงจำ
- Body type: `var(--font-sans)` สำหรับข้อความและ controls
- พื้นหลัก: cream/paper; action หลัก: deep green; accent: sage/honey/clay
- Radius และ shadow ใช้ tokens แทนการสร้างค่าที่ใกล้กันหลายชุด

Tokens อยู่ใน `src/app/globals.css`:

- สี: `--color-cream-*`, `--color-paper`, `--color-ink`, `--color-muted`, `--color-green`, `--color-green-deep`, `--color-sage`, `--color-sage-strong`, `--color-honey`
- พื้นผิว: `--color-border`, `--shadow-card`, `--shadow-soft`
- รูปทรง: `--radius-sm`, `--radius-md`, `--radius-lg`
- Typography: `--font-display`, `--font-sans`

Alias เดิม `--background`, `--foreground`, `--surface`, `--accent`, `--muted`, `--border` ยังอยู่เพื่อไม่ให้หน้า skeleton ของเพื่อนพัง

## Shared components

- `ActionLink`: primary/secondary link button ขนาดสัมผัสอย่างน้อย 44px
- `MoodBadge`: รับ `Mood | null` จาก contract และใช้ label กลางเท่านั้น
- `icons.tsx`: icon SVG แบบ `currentColor` ไม่มี dependency เพิ่ม
- `SiteHeader`: ปรับเฉพาะ visual/touch target; routes เดิมไม่เปลี่ยน

## Responsive rule ของห้อง

- `< 1024px`: ใช้ memory card grid; 2 คอลัมน์บนโทรศัพท์ตามต้นแบบ และยังอ่าน title/date ได้
- `>= 1024px`: ใช้ฉาก 3D (Three.js/R3F, orthographic isometric) พร้อมแผงข้อมูลด้านขวา; คลิกกรอบ/สมุดเพื่อเลือก memory แล้วเปิดจากปุ่ม "Open memory" ในแผง และมีรายการปุ่มสำหรับคีย์บอร์ด/screen reader
- ห้ามย่อฉาก desktop ลงมือถือ
- Interactive object/card บนมือถือ/Gallery ต้องเป็น native link, มี focus-visible และไป `/rooms/[roomId]/memories/[memoryId]`; ในฉาก 3D desktop การคลิกวัตถุจะเลือก memory (แผงขวา) และเปิดผ่าน native link "Open memory"

Mood ที่อนุญาตมีเพียง `awful`, `stressed`, `sad`, `relaxed`, `happy`, `excited` และ `null`; ไม่ใช้ Calm/Tired จาก visual reference
