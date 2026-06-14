/**
 * Bill of Materials (BOM) per ProductionJob
 *
 * ตามผัง Update Weekly: "เป้าหมายงานผลิต → เบิกสต็อกตามรายการ → สต็อกฝ่ายผลิต"
 *
 * Lifecycle:
 *   1. addBomLine — บันทึกรายการวัตถุดิบที่ต้องใช้ (qty_required)
 *   2. issueBomLine — เบิกของจาก bin ต้นทาง (ISSUE) — เพิ่ม qty_issued
 *      ของจะลดออกจาก stock ของ bin ต้นทาง (ฝ่ายผลิตเอาไปใช้)
 *   3. removeBomLine — ลบรายการ (ต่อเมื่อยังไม่เบิก)
 */
import { prisma } from "@/lib/prisma";
import { writeMovement } from "./stock.service";

export interface AddBomLineInput {
  jobId:              string;
  materialProductId:  string;
  qtyRequired:        number;
  notes?:             string | null;
}

export interface IssueBomLineInput {
  lineId:        string;
  lotId:         string;
  fromBinId:     string;
  qty:           number;
  performedBy:   string;
  notes?:        string;
}

export async function addBomLine(input: AddBomLineInput) {
  return prisma.productionBomLine.create({
    data: {
      production_job_id:   input.jobId,
      material_product_id: input.materialProductId,
      qty_required:        input.qtyRequired,
      notes:               input.notes,
    },
  });
}

export async function removeBomLine(lineId: string) {
  const line = await prisma.productionBomLine.findUnique({
    where:  { id: lineId },
    select: { qty_issued: true },
  });
  if (!line) throw new Error("ไม่พบรายการ BOM");
  if (Number(line.qty_issued) > 0) {
    throw new Error("ลบไม่ได้ — รายการนี้เบิกไปแล้ว");
  }
  return prisma.productionBomLine.delete({ where: { id: lineId } });
}

/**
 * เบิกวัตถุดิบจาก bin ต้นทาง — สร้าง ISSUE movement + เพิ่ม qty_issued
 * ไม่ได้ส่งไป bin ปลายทาง (ฝ่ายผลิตเอาไปใช้เลย — ของหายจากระบบในรูป "issued")
 */
export async function issueBomLine(input: IssueBomLineInput) {
  const line = await prisma.productionBomLine.findUnique({
    where:   { id: input.lineId },
    include: { production_job: { select: { id: true, job_number: true } } },
  });
  if (!line) throw new Error("ไม่พบรายการ BOM");

  const remaining = Number(line.qty_required) - Number(line.qty_issued);
  if (input.qty <= 0) throw new Error("จำนวนเบิกต้องมากกว่า 0");
  if (input.qty > remaining) {
    throw new Error(`เบิกเกิน — เหลือเบิกได้ ${remaining}`);
  }

  // writeMovement เป็น atomic อยู่แล้ว — ทำก่อน เพื่อกัน stock ไม่พอ
  const movement = await writeMovement({
    productId:     line.material_product_id,
    lotId:         input.lotId,
    type:          "ISSUE",
    qty:           input.qty,
    fromBinId:     input.fromBinId,
    performedBy:   input.performedBy,
    referenceType: "production_bom",
    referenceId:   line.production_job.id,
    notes:         input.notes ?? `เบิกวัตถุดิบเข้างาน ${line.production_job.job_number}`,
  });

  await prisma.productionBomLine.update({
    where: { id: input.lineId },
    data:  { qty_issued: { increment: input.qty } },
  });

  return movement;
}
