# Contributing — แนวทางการทำงานในทีม

เอกสารนี้คือ **กติกาการทำงานร่วมกัน** ของทีม warehouse-pro เพื่อให้ history โค้ดสะอาด, debug ง่าย, onboard คนใหม่ได้เร็ว

---

## กฎเหล็ก 5 ข้อ

### 1. 1 feature = 1 branch
- ห้ามใส่ 2 เรื่องไม่เกี่ยวกันใน branch เดียว
- ขนาด ideal: merge ได้ภายใน **1–3 วัน** / โค้ดเปลี่ยน **< 400 บรรทัด** ต่อ PR

### 2. ห้าม push ตรงไปที่ `master`
- ทุก commit ต้องผ่าน **Pull Request** + รีวิว ≥ 1 คน
- มี Branch Protection บน GitHub บังคับไว้

### 3. ตั้งชื่อ branch ตาม convention
```
feat/<หัวข้อ>        — ฟีเจอร์ใหม่           เช่น feat/audit-log
fix/<หัวข้อ>         — แก้ bug              เช่น fix/order-pick-quarantine
refactor/<หัวข้อ>    — ปรับโครงสร้าง         เช่น refactor/auth-helper
chore/<หัวข้อ>       — งานเบ็ดเตล็ด          เช่น chore/update-deps
docs/<หัวข้อ>        — เอกสาร              เช่น docs/api-readme
```

### 4. Commit message เป็น Conventional Commits
รูปแบบ:
```
<type>: <สรุปสั้น ภาษาเข้าใจง่าย ขึ้นต้นด้วยกริยา>

<รายละเอียดเพิ่ม (optional)>
```

ตัวอย่างที่ดี:
```
feat: เพิ่มระบบกักกัน lot ใน writeMovement
fix: แก้ bug คลิก notification mark all ผิด
chore: ลบ temp script
refactor: แยก visibleToUser helper ใน notification.service
```

ตัวอย่างที่ไม่เอา: `update`, `commit`, `123`, `ืnow`, `comit`, `fix bug`

### 5. ลบ branch หลัง merge เสร็จ
- ลด clutter ใน Sourcetree / GitHub
- GitHub จะมีปุ่ม "Delete branch" หลัง merge — กดเลย

---

## Workflow ตั้งแต่ต้นจนจบ

```
1. checkout master + pull            → เอาล่าสุดเสมอ
2. branch ใหม่ตาม convention         → git checkout -b feat/xxx
3. แก้โค้ด + commit ทีละก้อนเล็ก     → message ชัดเจน
4. push branch ขึ้น GitHub           → git push -u origin feat/xxx
5. เปิด Pull Request                  → ตอบให้ครบใน template
6. รอ review + แก้ตาม comment        → กดมาร์ค resolved
7. Merge เข้า master + ลบ branch
```

---

## ก่อนขอ review — Checklist เซลฟ์เช็ค

- [ ] `npx tsc --noEmit` — ไม่มี error ใน `src/`
- [ ] `npm run lint` — ผ่าน
- [ ] ทดสอบบน browser แล้ว (UI change)
- [ ] อ่าน diff ตัวเองอีกรอบ — ไม่มี debug log / commented code ค้าง
- [ ] PR description ครบตาม template

---

## การ Review (สำหรับคนรีวิว)

- ⏱ ตอบภายใน **24 ชม. ของวันทำงาน**
- ดู: ความถูกต้อง, security, performance, naming, test
- comment **specific** (ระบุบรรทัด, เสนอวิธี) — อย่า "นี่ไม่ดี" เฉยๆ
- ใช้ **suggestion block** ใน GitHub ถ้าเสนอโค้ดได้
- Approve เมื่อพร้อม merge — ถ้ามีจุดไม่ blocker ใส่ใน comment ว่า "non-blocking"

---

## สิ่งที่ห้าม commit

- 🔒 ไฟล์ลับ: `.env`, `.env.*`, credentials, private keys
- 💻 Personal config: `.claude/settings.local.json`, `.vscode/settings.json` (ของแต่ละคน)
- 🗑️ Temp test scripts ที่ใช้ครั้งเดียวทิ้ง
- 📦 `node_modules/`, `.next/`, `dist/`

(ส่วนใหญ่ถูก `.gitignore` ไว้แล้ว — แต่ระวังตัวเองด้วย)

---

## เมื่อมีคนหลายคนทำงานพร้อมกัน

- **เช็ค Sourcetree/GitHub ก่อนเริ่ม** ว่ามีใครทำ branch อะไรอยู่บ้าง
- ถ้าจะแก้ส่วนเดียวกับคนอื่น → **คุยก่อน** อย่าทำซ้อน
- pull master บ่อยๆ ระหว่างทำ branch (อย่างน้อยวันละครั้ง) — ลด merge conflict

---

## Source of truth

- **Spec ลูกค้า:** ยึด `Update Weekly.pdf` (ผังงานระบบคลัง) เป็นหลัก
- **กรณีโค้ดขัดกับ spec** → spec ชนะ ปรับโค้ดให้ตรง

---

มีอะไรไม่เคลียร์ ถาม @หัวหน้าทีม ได้
