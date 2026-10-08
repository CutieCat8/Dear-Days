# Feature components

วาง presentation/form components แยกตามเจ้าของงานในโฟลเดอร์ย่อยต่อไปนี้เมื่อเริ่มพัฒนา:

- `auth/`, `museum/` — ซี
- `memory/`, `media/`, `tags/` — จิรวัฒน์
- `home/`, `room-form/`, `gallery/` — สิรวิชญ์

Component รับ typed props จาก `@/lib/contracts`; route page เป็นผู้เลือก data source
และส่งข้อมูลลงมา เพื่อไม่ให้ Supabase query กระจายอยู่ใน UI.
