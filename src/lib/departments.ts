import { Department } from "@prisma/client";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  INBOUND:     "ฝ่ายรับเข้า",
  PRODUCTION:  "ฝ่ายผลิต",
  ADMIN_DEPT:  "ฝ่าย Admin / คำสั่งซื้อ",
  AFTER_SALES: "ฝ่ายบริการหลังการขาย",
  WAREHOUSE:   "ฝ่ายคลัง / สินค้า",
};

export const DEPARTMENT_DESCRIPTIONS: Record<Department, string> = {
  INBOUND:     "รับสินค้า, ตรวจสอบเอกสาร, QC เบื้องต้น",
  PRODUCTION:  "ประกอบ, ซ่อม, แยกชิ้นส่วน, ตีตรา",
  ADMIN_DEPT:  "คำสั่งซื้อ, PO, จัดส่ง",
  AFTER_SALES: "เคสบริการ, ใบลดหนี้, ใบแจ้งหนี้, แลกเครื่อง",
  WAREHOUSE:   "สินค้า, คลัง, ล็อต, สต็อก, โอนย้าย",
};

export const DEPARTMENT_COLORS: Record<Department, string> = {
  INBOUND:     "bg-amber-500/10 text-amber-700 border-amber-500/30",
  PRODUCTION:  "bg-blue-500/10 text-blue-700 border-blue-500/30",
  ADMIN_DEPT:  "bg-purple-500/10 text-purple-700 border-purple-500/30",
  AFTER_SALES: "bg-pink-500/10 text-pink-700 border-pink-500/30",
  WAREHOUSE:   "bg-green-500/10 text-green-700 border-green-500/30",
};

export const ALL_DEPARTMENTS: Department[] = [
  "INBOUND", "PRODUCTION", "ADMIN_DEPT", "AFTER_SALES", "WAREHOUSE",
];
