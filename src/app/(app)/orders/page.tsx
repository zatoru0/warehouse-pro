import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

async function getOrders() {
  return prisma.order.findMany({
    include: {
      customer: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { ordered_at: "desc" },
    take: 50,
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  CONFIRMED: "bg-blue-500/10 text-blue-400",
  PICKING: "bg-purple-500/10 text-purple-400",
  PACKING: "bg-cyan-500/10 text-cyan-400",
  READY_TO_SHIP: "bg-green-500/10 text-green-400",
  SHIPPED: "bg-green-500/20 text-green-300",
  DELIVERED: "bg-green-700/20 text-green-200",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED: "bg-red-500/10 text-red-400",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/orders/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-mono text-xs font-medium text-amber-400 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.channel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.customer?.name ?? "Walk-in"}</td>
                    <td className="px-4 py-3">{order._count.lines}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {order.total_amount ? `฿${Number(order.total_amount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(order.ordered_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
