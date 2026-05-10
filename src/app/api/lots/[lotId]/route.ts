import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { lotId } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      product: { select: { name: true, name_th: true, sku: true, unit: true } },
      stock_items: {
        select: {
          qty_on_hand: true,
          bin: {
            select: {
              code: true,
              warehouse: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!lot) return NextResponse.json({ error: "ไม่พบ Lot" }, { status: 404 });
  return NextResponse.json(lot);
}
