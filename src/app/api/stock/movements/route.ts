import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") ?? "1");

  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(productId && { product_id: productId }),
      ...(type && { movement_type: type as any }),
      ...(from || to
        ? {
            performed_at: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    include: {
      product: { select: { name: true, sku: true } },
      lot: { select: { lot_number: true } },
      user: { select: { full_name: true } },
    },
    orderBy: { performed_at: "desc" },
    skip: (page - 1) * 50,
    take: 50,
  });

  return NextResponse.json(movements);
}
