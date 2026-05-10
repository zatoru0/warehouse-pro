import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      handler:  { select: { full_name: true } },
      lines:    { include: { product: { select: { name: true, sku: true, unit: true } } } },
      shipments: true,
    },
  });
  if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  return NextResponse.json(order);
}
