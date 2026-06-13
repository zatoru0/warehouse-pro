/**
 * QC review — บันทึกผลการตรวจสอบคุณภาพ (PASS / FAIL) 
 * พร้อมแยกโฟลว์: ผ่านรอตีตรา, เสียส่งซ่อม, หรือประกอบผิดส่งแก้ไข
 */
import { prisma } from "@/lib/prisma";
// TODO: อย่าลืม Import numbering.service ตามที่โปรเจกต์คุณใช้ เช่น
// import { generateDocumentNumber } from "@/services/numbering.service";

export interface ReviewInput {
  recordId:    string;
  result:      "PASS" | "FAIL";
  qtyPassed:   number;
  qtyFailed:   number;
  inspectedBy: string;
  notes?:      string;
  isDefective?: boolean; 
}

export async function reviewRecord(input: ReviewInput) {
  const record = await prisma.qcRecord.findUnique({ where: { id: input.recordId } });
  if (!record) throw new Error("ไม่พบรายการตรวจสอบ");
  if (record.result !== "PENDING") throw new Error("รายการนี้ตรวจสอบแล้ว");

  return prisma.$transaction(async (tx) => {
    
    // 1. อัปเดตสถานะใบ QC ว่าผ่าน/ไม่ผ่าน
    const updatedRecord = await tx.qcRecord.update({
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

    if (record.lot_id) {
      // 🎯 หาคลังต้นทางที่ของรอตรวจอยู่ (Seed ใช้ WAIT_QC)
      const waitQcBin = await tx.bin.findFirst({ where: { code: "WAIT_QC" } });
      if (!waitQcBin) throw new Error("❌ ข้อมูลคลังผิดพลาด: ไม่พบคลัง 'WAIT_QC' ในระบบ");

      const defaultWarehouse = await tx.warehouse.findFirst(); // หรือระบุให้เจาะจงถ้ามี
      if (!defaultWarehouse) throw new Error("❌ ไม่พบคลังสินค้าหลักในระบบ");

      // ==========================================
      // โฟลว์ของที่ "ผ่าน QC" (PASS) -> โอนไปพักที่ QC_PASS รอการตีตรา
      // ==========================================
      if (input.qtyPassed > 0) {
        const qcPassBin = await tx.bin.findFirst({ where: { code: "QC_PASS" } });
        if (!qcPassBin) throw new Error("❌ ข้อมูลคลังผิดพลาด: ไม่พบคลัง 'QC_PASS' สำหรับเก็บของรอตีตรา");

        await tx.stockItem.updateMany({
          where: { product_id: record.product_id, lot_id: record.lot_id, bin_id: waitQcBin.id },
          data: { qty_on_hand: { decrement: input.qtyPassed } }
        });

        await tx.stockItem.upsert({
          where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: qcPassBin.id } },
          update: { qty_on_hand: { increment: input.qtyPassed } },
          create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: qcPassBin.id, qty_on_hand: input.qtyPassed }
        });

        await tx.stockMovement.create({
          data: {
            product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "QC",
            qty: input.qtyPassed, from_bin_id: waitQcBin.id, to_bin_id: qcPassBin.id, performed_by: input.inspectedBy,
            notes: "QC ผ่าน: โอนย้ายสินค้ารอตีตรา (Certify)",
          }
        });
      }

      // ==========================================
      // โฟลว์ของที่ "ไม่ผ่าน QC" (FAIL) -> แยกสาย ซ่อม / แก้ไข
      // ==========================================
      if (input.qtyFailed > 0) {
        // หักของเสียออกจาก WAIT_QC
        await tx.stockItem.updateMany({
          where: { product_id: record.product_id, lot_id: record.lot_id, bin_id: waitQcBin.id },
          data: { qty_on_hand: { decrement: input.qtyFailed } }
        });

        // สาย A: สินค้า "เสีย" -> ส่งซ่อม (เข้าคลัง WAIT_REPAIR)
        if (input.isDefective) {
          const repairBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
          if (!repairBin) throw new Error("❌ ข้อมูลคลังผิดพลาด: ไม่พบคลัง 'WAIT_REPAIR'");
          
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: repairBin.id } },
            update: { qty_on_hand: { increment: input.qtyFailed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: repairBin.id, qty_on_hand: input.qtyFailed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "QC",
              qty: input.qtyFailed, from_bin_id: waitQcBin.id, to_bin_id: repairBin.id, performed_by: input.inspectedBy,
              notes: "QC ไม่ผ่าน (สินค้าเสีย): โอนเข้าสต็อกรอซ่อม",
            }
          });

          // 🚨 รันเอกสารด้วย Numbering Service แทน Date.now()
          // const rpJobNum = await generateDocumentNumber("REPAIR_JOB", tx);
          const rpJobNum = `RP-QC-${Date.now()}`; // **แก้บรรทัดนี้ให้ใช้ Service ของคุณ**

          await tx.repairJob.create({
            data: {
              job_number: rpJobNum,
              product_id: record.product_id,
              status: "WAIT_REPAIR",
              issue_desc: `แจ้งซ่อมจาก QC (ใบตรวจ: ${record.id}) - เหตุผล: ${input.notes || "ไม่ระบุ"}`,
              received_by: input.inspectedBy,
            }
          });
        } 
        
        // สาย B: แค่ "ประกอบผิด" -> ส่งแก้ไข (เข้าคลัง ASSEMBLY)
        else {
          const assemblyBin = await tx.bin.findFirst({ where: { code: "ASSEMBLY" } });
          if (!assemblyBin) throw new Error("❌ ข้อมูลคลังผิดพลาด: ไม่พบคลัง 'ASSEMBLY'");

          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: assemblyBin.id } },
            update: { qty_on_hand: { increment: input.qtyFailed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: assemblyBin.id, qty_on_hand: input.qtyFailed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "QC",
              qty: input.qtyFailed, from_bin_id: waitQcBin.id, to_bin_id: assemblyBin.id, performed_by: input.inspectedBy,
              notes: "QC ไม่ผ่าน (ประกอบผิด): โอนกลับไปแก้ไขที่สายพานผลิต",
            }
          });

          // 🚨 รันเอกสารด้วย Numbering Service แทน Date.now()
          // const prdJobNum = await generateDocumentNumber("PRODUCTION_JOB", tx);
          const prdJobNum = `PD-REWORK-${Date.now()}`; // **แก้บรรทัดนี้ให้ใช้ Service ของคุณ**

          await tx.productionJob.create({
            data: {
              job_number: prdJobNum,
              product_id: record.product_id,
              warehouse_id: defaultWarehouse.id,
              job_type: "REWORK", 
              qty_planned: input.qtyFailed,
              qty_produced: 0,
              priority: "URGENT",
              status: "PENDING",
              notes: `งานแก้ไขจาก QC (ใบตรวจ: ${record.id}) - เหตุผล: ${input.notes}`,
            }
          });
        }
      }
    }

    return updatedRecord;
  });
}