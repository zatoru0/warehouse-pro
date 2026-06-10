import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Package, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

const TRANSIT_LABELS: Record<string, string> = {
  NOT_SHIPPED: "ยังไม่ส่ง",
  IN_TRANSIT:  "กำลังขนส่ง",
  ARRIVED:     "ถึงคลังแล้ว",
};

const TRANSIT_COLORS: Record<string, string> = {
  NOT_SHIPPED: "bg-muted text-muted-foreground",
  IN_TRANSIT:  "bg-blue-500/10 text-blue-600",
  ARRIVED:     "bg-green-500/10 text-green-600",
};

async function getTransitPOs() {
  return prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["SENT", "PARTIAL"] },
    },
    include: {
      supplier: { select: { name: true, code: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: [
      { transit_status: "asc" },
      { expected_date: "asc" },
    ],
  });
}

export default async function POTransitPage() {
  const pos = await getTransitPOs();

  const notShipped = pos.filter((p) => p.transit_status === "NOT_SHIPPED");
  const inTransit  = pos.filter((p) => p.transit_status === "IN_TRANSIT");
  const arrived    = pos.filter((p) => p.transit_status === "ARRIVED");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ติดตามขนส่ง PO</h2>
          <p className="text-xs text-muted-foreground">
            PO ที่ยังเปิดอยู่ — กำลังขนส่ง {inTransit.length} / รอส่ง {notShipped.length} / ถึงคลัง {arrived.length}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="รอส่ง"
          count={notShipped.length}
          color="text-muted-foreground"
        />
        <SummaryCard
          icon={<Truck className="h-4 w-4 text-blue-500" />}
          label="กำลังขนส่ง"
          count={inTransit.length}
          color="text-blue-600"
        />
        <SummaryCard
          icon={<MapPin className="h-4 w-4 text-green-500" />}
          label="ถึงคลังแล้ว"
          count={arrived.length}
          color="text-green-600"
        />
      </div>

      {pos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>ไม่มี PO ที่กำลังขนส่ง</p>
          </CardContent>
        </Card>
      ) : (
        <Section
          title="กำลังขนส่ง"
          items={inTransit}
          emptyText="ไม่มี PO ที่กำลังขนส่ง"
          today={today}
        />
      )}

      {notShipped.length > 0 && (
        <Section title="รอส่ง" items={notShipped} today={today} />
      )}

      {arrived.length > 0 && (
        <Section title="ถึงคลังแล้ว (รอรับเข้า)" items={arrived} today={today} />
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, count, color,
}: {
  icon: React.ReactNode; label: string; count: number; color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{count}</p>
        </div>
        <div className="rounded-full bg-muted p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}

type PO = Awaited<ReturnType<typeof getTransitPOs>>[number];

function Section({
  title, items, emptyText, today,
}: {
  title: string;
  items: PO[];
  emptyText?: string;
  today: Date;
}) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-sm font-semibold text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-xs text-muted-foreground">{emptyText}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลข PO</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้จัดหา</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะขนส่ง</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ขนส่ง / Tracking</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">กำหนดรับ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">อัพเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {items.map((po) => {
                  const isLate = po.expected_date && po.expected_date < today && po.transit_status !== "ARRIVED";
                  const lastUpdate = po.arrived_at ?? po.in_transit_at ?? po.shipped_at ?? po.updated_at;
                  return (
                    <tr key={po.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/purchase-orders/${po.id}`} className="font-mono text-xs font-semibold text-red-600 hover:underline">
                          {po.po_number}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{po._count.lines} รายการ</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{po.supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{po.supplier.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TRANSIT_COLORS[po.transit_status]}`}>
                          {TRANSIT_LABELS[po.transit_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {po.carrier ? (
                          <>
                            <p className="text-xs font-medium">{po.carrier}</p>
                            {po.tracking_number && (
                              <p className="font-mono text-[11px] text-muted-foreground">{po.tracking_number}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isLate ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                        {po.expected_date
                          ? format(new Date(po.expected_date), "dd MMM yyyy") + (isLate ? " (เกินกำหนด)" : "")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(lastUpdate), "dd MMM HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
