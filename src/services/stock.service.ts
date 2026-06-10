/**
 * Atomic stock movements — บันทึก movement + อัพเดต stock_items ใน transaction เดียว
 * ใช้สำหรับทุกการเคลื่อนไหวสต็อก (รับเข้า, จ่ายออก, ย้าย, ปรับ)
 */
import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// movement ที่เป็นการเบิก/ขาย/บริโภคของจาก lot — ต้องมาจาก lot ที่ ACTIVE เท่านั้น
// (TRANSFER / ADJUST_OUT ปล่อยได้ — ย้ายของกักกัน หรือ ตัดทิ้ง)
const CONSUMING_TYPES: StockMovementType[] = ["ISSUE", "REPAIR_OUT", "DISASSEMBLY_OUT"];

const LOT_STATUS_LABELS: Record<string, string> = {
  ACTIVE:     "ใช้งาน",
  QUARANTINE: "กักกัน",
  EXPIRED:    "หมดอายุ",
  CONSUMED:   "ใช้หมดแล้ว",
};

export interface MovementInput {
  productId:      string;
  lotId:          string;
  type:           StockMovementType;
  qty:            number;
  fromBinId?:     string;
  toBinId?:       string;
  performedBy:    string;
  referenceType?: string;
  referenceId?:   string;
  notes?:         string;
}

/**
 * Write a stock movement and update bin balances atomically.
 * - fromBinId set → ลด stock จาก bin นั้น
 * - toBinId set → เพิ่ม stock ไป bin นั้น
 * - ทั้งคู่ → transfer
 */
export async function writeMovement(input: MovementInput) {
  const {
    productId, lotId, type, qty,
    fromBinId, toBinId,
    performedBy, referenceType, referenceId, notes,
  } = input;

  // กันการเบิก/ขายของจาก lot ที่ไม่ ACTIVE (กักกัน/หมดอายุ/ใช้หมด)
  if (CONSUMING_TYPES.includes(type)) {
    const lot = await prisma.lot.findUnique({
      where:  { id: lotId },
      select: { status: true, lot_number: true },
    });
    if (lot && lot.status !== "ACTIVE") {
      const label = LOT_STATUS_LABELS[lot.status] ?? lot.status;
      throw new Error(`Lot ${lot.lot_number} อยู่สถานะ "${label}" — เบิก/ขายไม่ได้`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        product_id:     productId,
        lot_id:         lotId,
        movement_type:  type,
        qty,
        from_bin_id:    fromBinId,
        to_bin_id:      toBinId,
        performed_by:   performedBy,
        reference_type: referenceType,
        reference_id:   referenceId,
        notes,
      },
    });

    if (fromBinId) {
      await tx.stockItem.upsert({
        where:  { product_id_lot_id_bin_id: { product_id: productId, lot_id: lotId, bin_id: fromBinId } },
        create: { product_id: productId, lot_id: lotId, bin_id: fromBinId, qty_on_hand: -qty },
        update: { qty_on_hand: { decrement: qty } },
      });
    }

    if (toBinId) {
      await tx.stockItem.upsert({
        where:  { product_id_lot_id_bin_id: { product_id: productId, lot_id: lotId, bin_id: toBinId } },
        create: { product_id: productId, lot_id: lotId, bin_id: toBinId, qty_on_hand: qty },
        update: { qty_on_hand: { increment: qty } },
      });
    }

    return movement;
  });
}

export async function reserveStock(productId: string, lotId: string, binId: string, qty: number) {
  return prisma.stockItem.updateMany({
    where: { product_id: productId, lot_id: lotId, bin_id: binId },
    data:  { qty_reserved: { increment: qty } },
  });
}

export async function releaseReservation(productId: string, lotId: string, binId: string, qty: number) {
  return prisma.stockItem.updateMany({
    where: { product_id: productId, lot_id: lotId, bin_id: binId },
    data:  { qty_reserved: { decrement: qty } },
  });
}
