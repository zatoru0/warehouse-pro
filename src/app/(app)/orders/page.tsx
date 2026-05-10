import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ORDER_CHANNEL_LABEL, ORDER_CHANNEL_ICON } from "@/lib/order-channels";

async function getOrders() {
  return prisma.order.findMany({
    include: {
      customer: { select: { name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { ordered_at: "desc" },
    take: 50,
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-red-600/10 text-red-600",
  CONFIRMED: "bg-blue-500/10 text-blue-600",
  PICKING:   "bg-purple-500/10 text-purple-600",
  PACKING:   "bg-cyan-500/10 text-cyan-600",
  SHIPPED:   "bg-green-500/10 text-green-600",
  DELIVERED: "bg-green-700/10 text-green-700",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED:  "bg-red-500/10 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  PICKING:   "กำลังหยิบ",
  PACKING:   "กำลังแพ็ก",
  SHIPPED:   "จัดส่งแล้ว",
  DELIVERED: "ส่งถึงแล้ว",
  CANCELLED: "ยกเลิก",
  RETURNED:  "คืนสินค้า",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">คำสั่งซื้อ</h2>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-3.5 w-3.5" />
          สร้างคำสั่งซื้อ
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ช่องทาง</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดรวม</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-mono text-xs font-medium text-red-600 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
                        <span>{ORDER_CHANNEL_ICON[order.channel] ?? "📋"}</span>
                        <span>{ORDER_CHANNEL_LABEL[order.channel] ?? order.channel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.customer?.name ?? "ลูกค้าหน้าร้าน"}</td>
                    <td className="px-4 py-3">{order._count.lines}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {order.total_amount ? `฿${Number(order.total_amount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(order.ordered_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? ""}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      ยังไม่มีคำสั่งซื้อ
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
