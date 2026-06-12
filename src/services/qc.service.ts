/**
 * QC review — บันทึกผลการตรวจสอบคุณภาพ (PASS / FAIL) พร้อมแยกโฟลว์ แก้ไข/ส่งซ่อม
 */
import { prisma } from "@/lib/prisma";

export interface ReviewInput {
  recordId:    string;
  result:      "PASS" | "FAIL";
  qtyPassed:   number;
  qtyFailed:   number;
  inspectedBy: string;
  notes?:      string;
  isDefective?: boolean; // ✨ เพิ่มตัวแปร: ระบุว่า "สินค้าเสีย (true)" หรือ "แค่ต้องแก้ไข (false)"
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

    // 2. จัดการสต็อก QC ขาออก (หาถังเก็บ QC เพื่อดึงของออก)
    const qcBin = await tx.bin.findFirst({ where: { code: "QC_BIN" } });

    // 3. ✨ กระบวนการแยกสายเมื่อ "ไม่ผ่าน" ตาม Flowchart
    if (input.qtyFailed > 0 && qcBin && record.lot_id) {
      
      const defaultWarehouse = await tx.warehouse.findFirst();
      if (!defaultWarehouse) throw new Error("ไม่พบคลังสินค้าหลักในระบบ");

      // หักยอดของเสียออกจากคลัง QC 
      await tx.stockItem.updateMany({
        where: { product_id: record.product_id, lot_id: record.lot_id, bin_id: qcBin.id },
        data: { qty_on_hand: { decrement: input.qtyFailed } }
      });

      // ==========================================
      // สาย A: สินค้า "เสีย" -> ส่งซ่อม (ฝ่ายบริการหลังการขาย / สต็อกช่าง)
      // ==========================================
      if (input.isDefective) {
        // ✨ แก้ไข 1: เปลี่ยนรหัสคลังเป็น WAIT_REPAIR เพื่อให้ตรงกับสต็อกรอซ่อม
        const techBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
        
        if (techBin) {
          // เพิ่มยอดเข้าสต็อกฝ่ายช่าง
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: techBin.id } },
            update: { qty_on_hand: { increment: input.qtyFailed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: techBin.id, qty_on_hand: input.qtyFailed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "QC",
              qty: input.qtyFailed, to_bin_id: techBin.id, performed_by: input.inspectedBy,
              notes: "QC ไม่ผ่าน (สินค้าเสีย): โอนย้ายเข้าสต็อกฝ่ายช่างเพื่อส่งซ่อม",
            }
          });
        }

        // ✨ แก้ไข 2: เปลี่ยนจากการสร้าง ServiceTicket เป็น RepairJob เพื่อให้เด้งในหน้างานซ่อม
        await tx.repairJob.create({
          data: {
            job_number: `RP-QC-${Date.now()}`,
            product_id: record.product_id,
            status: "WAIT_REPAIR",
            issue_desc: `แจ้งซ่อมจาก QC (อ้างอิงใบตรวจ: ${record.id}) - เหตุผล: ${input.notes || "ไม่ระบุ"}`,
            received_by: input.inspectedBy,
          }
        });
      } 
      
      // ==========================================
      // สาย B: สินค้า "ไม่เสีย" (ประกอบผิด ฯลฯ) -> ส่งแก้ไข (กลับไปประกอบ/งานผลิต)
      // ==========================================
      else {
        const prodBin = await tx.bin.findFirst({ where: { code: "PRODUCTION_BIN" } });

        if (prodBin) {
          // เพิ่มยอดกลับเข้าฝ่ายผลิต
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: prodBin.id } },
            update: { qty_on_hand: { increment: input.qtyFailed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: prodBin.id, qty_on_hand: input.qtyFailed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "QC",
              qty: input.qtyFailed, to_bin_id: prodBin.id, performed_by: input.inspectedBy,
              notes: "QC ไม่ผ่าน (ประกอบผิด/แก้ไข): โอนย้ายกลับไปแผนกประกอบเพื่อแก้ไข",
            }
          });
        }

        // 🎯 สร้างใบสั่งงานกลับไปฝ่ายผลิต (ประเภท: แก้ไขงาน)
        await tx.productionJob.create({
          data: {
            job_number: `PD-REWORK-${Date.now()}`,
            product_id: record.product_id,
            warehouse_id: defaultWarehouse.id,
            job_type: "REWORK", // ชนิดงาน: แก้ไข/ทำใหม่
            qty_planned: input.qtyFailed,
            qty_produced: 0,
            priority: "URGENT",
            status: "PENDING",
            notes: `งานตีกลับจาก QC (อ้างอิงใบตรวจ: ${record.id}) ให้ทำการแก้ไข - เหตุผล: ${input.notes}`,
          }
        });
      }
    }

    return updatedRecord;
  });
}