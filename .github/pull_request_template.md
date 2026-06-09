<!--
  หลักการ: 1 PR = 1 เรื่อง  |  ขนาด: เล็กพอที่รีวิวได้ใน 30 นาที
  ถ้า PR ใหญ่กว่า ~400 บรรทัด — พิจารณาแยกเป็นหลาย PR
-->

## 🎯 PR นี้ทำอะไร
<!-- อธิบายสั้นๆ ว่าเพิ่ม/แก้/ลบอะไร -->

-

## 💡 ทำไมต้องทำ
<!-- เหตุผล / business value / ผังที่อ้างอิง (Update Weekly section ...) -->

-

## 📸 หลักฐาน (ถ้ามี UI)
<!-- screenshot หรือ GIF ของผลลัพธ์ -->

## ✅ Checklist ก่อนขอ review

- [ ] ตั้งชื่อ branch ตาม convention (`feat/`, `fix/`, `chore/`, `refactor/`, `docs/`)
- [ ] Commit message สื่อความหมาย (ไม่ใช่ "update", "fix", "123")
- [ ] รัน `npx tsc --noEmit` ผ่าน
- [ ] รัน `npm run lint` ผ่าน
- [ ] ทดสอบบน browser แล้ว (สำหรับ UI change)
- [ ] ไม่มีไฟล์ลับ/personal config (`.env`, `.claude/settings.local.json`) ติดมา
- [ ] ถ้าแก้ schema — รัน `npm run db:push` แล้ว

## 🧪 วิธีรีวิว/ทดสอบ
<!-- ขั้นตอนให้คนรีวิวเช็คผล: login เป็น user อะไร, ไปที่หน้าไหน, กดอะไร, คาดหวังอะไร -->

1.
2.

## 🔗 อ้างอิง
<!-- link Issue / Doc / PR ที่เกี่ยวข้อง -->

-
