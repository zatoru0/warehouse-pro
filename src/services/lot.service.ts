/**
 * Lot/Batch management — สร้าง lot ใหม่พร้อม barcode อัตโนมัติ
 */
import { prisma } from "@/lib/prisma";
import { nextLotNumber } from "./numbering.service";

export interface CreateLotInput {
  productId:        string;
  manufacturedAt?:  Date | null;
  expiresAt?:       Date | null;
}

export async function createLot(input: CreateLotInput) {
  const lot_number = await nextLotNumber();
  return prisma.lot.create({
    data: {
      product_id:      input.productId,
      lot_number,
      barcode:         lot_number,
      manufactured_at: input.manufacturedAt ?? null,
      expires_at:      input.expiresAt ?? null,
    },
  });
}
