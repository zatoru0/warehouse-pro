import { Package, ClipboardList, Truck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

async function getDashboardStats() {
  const [totalItems, pendingOrders, shippedToday, lowStockCount, recentMovements] =
    await Promise.all([
      prisma.stockItem.aggregate({ _sum: { qty_on_hand: true } }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "CONFIRMED", "PICKING", "PACKING"] } },
      }),
      prisma.shipment.count({
        where: {
          shipped_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.stockAlertRule
        .count({ where: { is_active: true } })
        .then(() =>
          prisma.stockItem.count({
            where: { qty_on_hand: { lte: 0 } },
          })
        ),
      prisma.stockMovement.findMany({
        take: 8,
        orderBy: { performed_at: "desc" },
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { full_name: true } },
        },
      }),
    ]);

  return {
    totalItems: Number(totalItems._sum.qty_on_hand ?? 0),
    pendingOrders,
    shippedToday,
    lowStockCount,
    recentMovements,
  };
}

const statCards = [
  {
    key: "totalItems" as const,
    label: "Total Items",
    icon: Package,
    color: "text-blue-400",
    change: "+3.2% vs last month",
    up: true,
  },
  {
    key: "pendingOrders" as const,
    label: "Pending Orders",
    icon: ClipboardList,
    color: "text-amber-400",
    change: "Awaiting processing",
    up: false,
  },
  {
    key: "shippedToday" as const,
    label: "Shipped Today",
    icon: Truck,
    color: "text-green-400",
    change: "Dispatched shipments",
    up: true,
  },
  {
    key: "lowStockCount" as const,
    label: "Low Stock Alerts",
    icon: AlertTriangle,
    color: "text-red-400",
    change: "Items below minimum",
    up: false,
  },
];

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${card.color}`}>
                {stats[card.key].toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">
                    {m.movement_type}
                  </span>
                  <span className="flex-1 font-medium">{m.product.name}</span>
                  <span className="text-muted-foreground">{m.user.full_name}</span>
                  <span className="text-muted-foreground">
                    {new Date(m.performed_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
