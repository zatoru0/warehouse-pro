import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const [
    totalItems,
    pendingOrders,
    shippedToday,
    lowStockAlerts,
    recentMovements,
    warehouseStats,
  ] = await Promise.all([
    prisma.stockItem.aggregate({ _sum: { qty_on_hand: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PICKING", "PACKING"] } } }),
    prisma.shipment.count({
      where: {
        shipped_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: "COMPLETED",
      },
    }),
    prisma.stockItem.count({
      where: {
        product: { alert_rule: { isNot: null } },
        qty_on_hand: { lte: 0 },
      },
    }),
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { performed_at: "desc" },
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { full_name: true } },
      },
    }),
    prisma.warehouse.findMany({
      include: {
        zones: {
          include: {
            bins: { select: { status: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalItems: Number(totalItems._sum.qty_on_hand ?? 0),
      pendingOrders,
      shippedToday,
      lowStockAlerts,
    },
    recentMovements,
    warehouseStats,
  });
}
