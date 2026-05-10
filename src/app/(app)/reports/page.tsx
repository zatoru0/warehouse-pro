import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfDay } from "date-fns";

async function getReportData() {
  const since30d = startOfDay(subDays(new Date(), 30));

  const [
    stockValue,
    movementsByType,
    receivingByType,
    ordersByStatus,
    ordersByChannel,
    topProducts,
    lowStock,
    recentMovements,
  ] = await Promise.all([
    // มูลค่าสต็อก
    prisma.stockItem.findMany({
      include: {
        product: { select: { name: true, cost_price: true, unit: true } },
      },
      where: { qty_on_hand: { gt: 0 } },
    }),

    // ความเคลื่อนไหวแยกตามประเภท (30 วัน)
    prisma.stockMovement.groupBy({
      by: ["movement_type"],
      _count: true,
      _sum: { qty: true },
      where: { performed_at: { gte: since30d } },
    }),

    // รับเข้าแยกตามประเภท (30 วัน)
    prisma.receivingJob.groupBy({
      by: ["receiving_type"],
      _count: true,
      where: { created_at: { gte: since30d } },
    }),

    // คำสั่งซื้อแยกตาม status
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
    }),

    // คำสั่งซื้อแยกตาม channel (30 วัน)
    prisma.order.groupBy({
      by: ["channel"],
      _count: true,
      where: { ordered_at: { gte: since30d } },
      orderBy: { _count: { channel: "desc" } },
    }),

    // สินค้าที่มี stock สูงสุด 10 อันดับ
    prisma.stockItem.groupBy({
      by: ["product_id"],
      _sum: { qty_on_hand: true },
      orderBy: { _sum: { qty_on_hand: "desc" } },
      take: 10,
      where: { qty_on_hand: { gt: 0 } },
    }),

    // สินค้าใกล้หมด
    prisma.product.findMany({
      where: {
        is_active: true,
        min_stock_qty: { gt: 0 },
      },
      include: {
        stock_items: { select: { qty_on_hand: true } },
      },
    }),

    // ความเคลื่อนไหว 10 รายการล่าสุด
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { performed_at: "desc" },
      include: {
        product: { select: { name: true } },
        user: { select: { full_name: true } },
      },
    }),
  ]);

  // คำนวณมูลค่าสต็อกรวม
  const totalStockValue = stockValue.reduce((sum, item) => {
    const cost = Number(item.product.cost_price ?? 0);
    const qty = Number(item.qty_on_hand);
    return sum + cost * qty;
  }, 0);

  // หา product names สำหรับ top products
  const productIds = topProducts.map((t) => t.product_id);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true },
  });
  const productMap = Object.fromEntries(productNames.map((p) => [p.id, p]));

  // สินค้าใกล้หมด (qty < min)
  const lowStockItems = lowStock
    .map((p) => ({
      name: p.name,
      totalQty: p.stock_items.reduce((s, i) => s + Number(i.qty_on_hand), 0),
      minQty: p.min_stock_qty,
    }))
    .filter((p) => p.totalQty <= p.minQty)
    .slice(0, 10);

  return {
    totalStockValue,
    movementsByType,
    receivingByType,
    ordersByStatus,
    ordersByChannel,
    topProducts: topProducts.map((t) => ({
      name: productMap[t.product_id]?.name ?? t.product_id,
      unit: productMap[t.product_id]?.unit ?? "",
      qty: Number(t._sum.qty_on_hand ?? 0),
    })),
    lowStockItems,
    recentMovements,
  };
}

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE:    "รับเข้า",
  ISSUE:      "เบิกออก",
  TRANSFER:   "โอนย้าย",
  ADJUST_IN:  "ปรับเพิ่ม",
  ADJUST_OUT: "ปรับลด",
  QC_FAIL:    "ไม่ผ่าน QC",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:   "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  PICKING:   "กำลังเบิก",
  PACKING:   "กำลังแพ็ก",
  SHIPPED:   "จัดส่งแล้ว",
  DELIVERED: "ส่งถึงแล้ว",
  CANCELLED: "ยกเลิก",
  RETURNED:  "คืนสินค้า",
};

const RECEIVING_TYPE_LABELS: Record<string, string> = {
  NEW_GOODS: "สินค้าใหม่",
  CLAIM:     "เคลม",
  REPAIR:    "ซ่อม",
  PARTS:     "อะไหล่",
  RETURN:    "คืนสินค้า",
};

export default async function ReportsPage() {
  const data = await getReportData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">รายงานและวิเคราะห์</h2>
        <p className="text-xs text-muted-foreground">ข้อมูล ณ {format(new Date(), "dd MMM yyyy HH:mm")}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">มูลค่าสต็อกรวม</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              ฿{data.totalStockValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">คำสั่งซื้อที่ยังค้าง</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {data.ordersByStatus
                .filter((o) => ["PENDING", "CONFIRMED", "PICKING", "PACKING"].includes(o.status))
                .reduce((s, o) => s + o._count, 0)
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">สินค้าใกล้หมด</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {data.lowStockItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ความเคลื่อนไหว 30 วัน */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ความเคลื่อนไหวสินค้า (30 วันล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.movementsByType.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">ยังไม่มีความเคลื่อนไหว</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ประเภท</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">รายการ</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวนรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movementsByType.map((m) => (
                    <tr key={m.movement_type} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</td>
                      <td className="px-4 py-2 text-right">{m._count}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {Number(m._sum.qty ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* คำสั่งซื้อแยก status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สถานะคำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.ordersByStatus.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อ</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordersByStatus.map((o) => (
                    <tr key={o.status} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                      <td className="px-4 py-2 text-right font-semibold">{o._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* รับเข้าแยกประเภท */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">การรับสินค้าแยกประเภท (30 วันล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.receivingByType.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">ยังไม่มีการรับสินค้า</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ประเภท</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">งาน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receivingByType.map((r) => (
                    <tr key={r.receiving_type} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{RECEIVING_TYPE_LABELS[r.receiving_type] ?? r.receiving_type}</td>
                      <td className="px-4 py-2 text-right font-semibold">{r._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* ช่องทางการขาย */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ช่องทางการขาย (30 วันล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.ordersByChannel.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อ</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ช่องทาง</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">คำสั่งซื้อ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordersByChannel.map((o) => (
                    <tr key={o.channel} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{o.channel}</td>
                      <td className="px-4 py-2 text-right font-semibold">{o._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 สินค้า */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สินค้าที่มี Stock สูงสุด 10 อันดับ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวนคงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-right">
                      {p.qty.toLocaleString()} {p.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* สินค้าใกล้หมด */}
      {data.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-amber-600">⚠ สินค้าใกล้หมด / ต่ำกว่าขั้นต่ำ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">คงเหลือ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">ขั้นต่ำ</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item) => (
                  <tr key={item.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">
                      {item.totalQty.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {item.minQty.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ความเคลื่อนไหวล่าสุด */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ความเคลื่อนไหวล่าสุด 10 รายการ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentMovements.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">ยังไม่มีความเคลื่อนไหว</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ประเภท</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวน</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ผู้ดำเนินการ</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">{m.product.name}</td>
                    <td className="px-4 py-2 text-right">{Number(m.qty).toLocaleString()}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{m.user.full_name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {format(new Date(m.performed_at), "dd MMM HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
