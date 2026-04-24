import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const productId = searchParams.get("productId");
  const lotId = searchParams.get("lotId");
  const lowStock = searchParams.get("lowStock") === "true";

  const items = await prisma.stockItem.findMany({
    where: {
      ...(productId && { product_id: productId }),
      ...(lotId && { lot_id: lotId }),
      ...(warehouseId && { bin: { zone: { warehouse_id: warehouseId } } }),
      ...(lowStock && { qty_on_hand: { lte: 0 } }),
    },
    include: {
      product: { select: { name: true, sku: true, unit: true, min_stock_qty: true } },
      lot: { select: { lot_number: true, status: true } },
      bin: { include: { zone: { include: { warehouse: { select: { name: true, type: true } } } } } },
    },
    orderBy: { updated_at: "desc" },
  });

  return NextResponse.json(items);
}
