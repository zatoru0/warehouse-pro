import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  passed: z.boolean(),
  notes:  z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireDepartment(req, ["QC", "WAREHOUSE"]);
  if (error) return error;
  const { id } = await params;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.qcRecord.findUnique({ where: { id } });
      if (!record) throw new Error("ไม่พบรายการ QC");
      if (record.result !== "PASS") throw new Error("ต้องผ่าน QC ก่อนตีตรา");
      if (record.is_certified) throw new Error("รายการนี้ถูกตีตราไปแล้ว");

      const { passed, notes } = parsed.data;

      // 1. อัปเดตสถานะใบ QC
      const updated = await tx.qcRecord.update({
        where: { id },
        data: {
          is_certified:  true, // ถือว่าผ่านกระบวนการพิจารณาตีตราแล้ว
          certified_at:  new Date(),
          certified_by:  user!.id,
          certify_notes: passed ? notes : `[ตีตราไม่ผ่าน] ${notes || ""}`,
        },
      });

      if (record.lot_id && Number(record.qty_passed) > 0) {
        const qcPassBin = await tx.bin.findFirst({ where: { code: "QC_PASS" } });
        if (!qcPassBin) throw new Error("❌ ไม่พบคลัง 'QC_PASS' ต้นทาง");

        // หักของออกจากคลังรอตีตรา (QC_PASS) เสมอ ไม่ว่าจะผ่านหรือไม่ผ่าน
        await tx.stockItem.updateMany({
          where: { product_id: record.product_id, lot_id: record.lot_id, bin_id: qcPassBin.id },
          data: { qty_on_hand: { decrement: record.qty_passed } }
        });

        // ==========================================
        // 🟢 สาย A: ตีตรา "ผ่าน" -> เข้าคลังพร้อมขาย (READY_BIN)
        // ==========================================
        if (passed) {
          const readyBin = await tx.bin.findFirst({ 
            where: { 
              OR: [
                { code: "FRONT_STOCK" }, // คลังหน้าร้าน/พร้อมขายของคุณ
                { code: "READY_BIN" }, 
                { code: "READY" },
                { code: "STOCK" },
                { warehouse: { type: "READY" } }
              ] 
            } 
          });
          if (!readyBin) throw new Error("❌ ข้อมูลคลังผิดพลาด: ไม่พบคลังสำหรับจัดเก็บสินค้าพร้อมขาย (เช่น FRONT_STOCK, READY) ในระบบ");

          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: readyBin.id } },
            update: { qty_on_hand: { increment: record.qty_passed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: readyBin.id, qty_on_hand: record.qty_passed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "CERTIFY",
              qty: record.qty_passed, from_bin_id: qcPassBin.id, to_bin_id: readyBin.id, performed_by: user!.id,
              notes: `ตีตราสำเร็จ: ย้ายสินค้าพร้อมขาย (อ้างอิง QC: ${record.id})`,
            }
          });
        } 
        // ==========================================
        // 🔴 สาย B: ตีตรา "ไม่ผ่าน" -> เด้งกลับไปคลังรอซ่อม (WAIT_REPAIR)
        // ==========================================
        else {
          const repairBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
          if (!repairBin) throw new Error("❌ ไม่พบคลัง 'WAIT_REPAIR' ปลายทาง");

          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: record.product_id, lot_id: record.lot_id, bin_id: repairBin.id } },
            update: { qty_on_hand: { increment: record.qty_passed } },
            create: { product_id: record.product_id, lot_id: record.lot_id, bin_id: repairBin.id, qty_on_hand: record.qty_passed }
          });

          await tx.stockMovement.create({
            data: {
              product_id: record.product_id, lot_id: record.lot_id, movement_type: "TRANSFER", reference_type: "CERTIFY",
              qty: record.qty_passed, from_bin_id: qcPassBin.id, to_bin_id: repairBin.id, performed_by: user!.id,
              notes: `ตีตราไม่ผ่าน: ตีกลับเข้าคลังรอซ่อม/ตรวจสอบใหม่ (อ้างอิง QC: ${record.id})`,
            }
          });
          
          // 💡 Note: หากต้องการให้ตีตราไม่ผ่านแล้วเด้งกลับไปคลังอื่น (เช่น กลับไปฝ่ายผลิต) สามารถเปลี่ยนโค้ดตรง WAIT_REPAIR เป็น ASSEMBLY ได้เลยครับ
        }
      }

      return updated;
    }, 
    // ✨ เติมปีกกานี้เข้าไป เพื่อป้องกัน Database ช้าแล้วตัดจบการทำงาน
    {
      maxWait: 10000, // ให้เวลารอคิว 10 วินาที
      timeout: 20000, // ให้เวลาทำงาน 20 วินาที
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}