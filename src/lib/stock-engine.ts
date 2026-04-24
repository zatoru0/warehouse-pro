import { StockMovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLowStock } from "@/lib/notification-service";

interface WriteMovementArgs {
  productId: string;
  lotId?: string;
  fromBinId?: string;
  toBinId?: string;
  type: StockMovementType;
  qty: number;
  performedBy: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export async function writeMovement(args: WriteMovementArgs) {
  const {
    productId, lotId, fromBinId, toBinId,
    type, qty, performedBy, referenceType, referenceId, notes,
  } = args;

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        product_id: productId,
        lot_id: lotId,
        from_bin_id: fromBinId,
        to_bin_id: toBinId,
        movement_type: type,
        qty,
        performed_by: performedBy,
        reference_type: referenceType,
        reference_id: referenceId,
        notes,
      },
    });

    // Deduct from source bin
    if (fromBinId && lotId) {
      await tx.stockItem.upsert({
        where: { product_id_lot_id_bin_id: { product_id: productId, lot_id: lotId, bin_id: fromBinId } },
        create: { product_id: productId, lot_id: lotId, bin_id: fromBinId, qty_on_hand: -qty },
        update: { qty_on_hand: { decrement: qty } },
      });
    }

    // Add to destination bin
    if (toBinId && lotId) {
      await tx.stockItem.upsert({
        where: { product_id_lot_id_bin_id: { product_id: productId, lot_id: lotId, bin_id: toBinId } },
        create: { product_id: productId, lot_id: lotId, bin_id: toBinId, qty_on_hand: qty },
        update: { qty_on_hand: { increment: qty } },
      });
    }
  });

  // Check low-stock rules after movements that reduce stock
  const depletionTypes: StockMovementType[] = [
    "ISSUE", "ADJUST_OUT", "ASSEMBLY_CONSUME",
    "DISASSEMBLY_CONSUME", "QC_FAIL", "SCRAP",
  ];
  if (depletionTypes.includes(type)) {
    await checkLowStock(productId);
  }
}

export async function reserveStock(productId: string, lotId: string, binId: string, qty: number) {
  await prisma.stockItem.updateMany({
    where: { product_id: productId, lot_id: lotId, bin_id: binId },
    data: { qty_reserved: { increment: qty } },
  });
}

export async function releaseReservation(productId: string, lotId: string, binId: string, qty: number) {
  await prisma.stockItem.updateMany({
    where: { product_id: productId, lot_id: lotId, bin_id: binId },
    data: { qty_reserved: { decrement: qty } },
  });
}
