/**
 * QC review — บันทึกผลการตรวจสอบคุณภาพ (PASS / FAIL)
 */
import { prisma } from "@/lib/prisma";

export interface ReviewInput {
  recordId:    string;
  result:      "PASS" | "FAIL";
  qtyPassed:   number;
  qtyFailed:   number;
  inspectedBy: string;
  notes?:      string;
}

export async function reviewRecord(input: ReviewInput) {
  const record = await prisma.qcRecord.findUnique({ where: { id: input.recordId } });
  if (!record) throw new Error("ไม่พบรายการตรวจสอบ");
  if (record.result !== "PENDING") throw new Error("รายการนี้ตรวจสอบแล้ว");

  return prisma.qcRecord.update({
    where: { id: input.recordId },
    data: {
      result:        input.result,
      qty_passed:    input.qtyPassed,
      qty_failed:    input.qtyFailed,
      notes:         input.notes,
      inspected_by:  input.inspectedBy,
      inspected_at:  new Date(),
    },
  });
}
