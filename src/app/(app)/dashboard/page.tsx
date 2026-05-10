import { Package, ClipboardList, Truck, AlertTriangle, Wrench, FlaskConical, Stamp, RefreshCcw, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DEPARTMENT_LABELS, DEPARTMENT_COLORS } from "@/lib/departments";
import Link from "next/link";

async function getDashboardStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    totalItems, pendingOrders, shippedToday, lowStockCount,
    pendingRepairs, pendingQC, pendingCertify, pendingExchange,
    recentMovements,
  ] = await Promise.all([
    prisma.stockItem.aggregate({ _sum: { qty_on_hand: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PICKING", "PACKING"] } } }),
    prisma.shipment.count({ where: { shipped_at: { gte: today } } }),
    prisma.product.count({
      where: {
        is_active: true,
        min_stock_qty: { gt: 0 },
        stock_items: { some: {} },
      },
    }),
    prisma.repairJob.count({ where: { status: { in: ["WAIT_REPAIR", "IN_REPAIR", "WAIT_QC"] } } }),
    prisma.qcRecord.count({ where: { result: "PENDING" } }),
    prisma.qcRecord.count({ where: { result: "PASS", is_certified: false, product: { allow_certify: true } } }),
    prisma.exchangeJob.count({ where: { status: "PENDING" } }),
    prisma.stockMovement.findMany({
      take: 8,
      orderBy: { performed_at: "desc" },
      include: {
        product: { select: { name: true, sku: true } },
        user:    { select: { full_name: true } },
      },
    }),
  ]);

  return {
    totalItems:      Number(totalItems._sum.qty_on_hand ?? 0),
    pendingOrders,
    shippedToday,
    lowStockCount,
    pendingRepairs,
    pendingQC,
    pendingCertify,
    pendingExchange,
    recentMovements,
  };
}

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE:        "รับเข้า",
  ISSUE:          "เบิกออก",
  ADJUST_IN:      "ปรับเพิ่ม",
  ADJUST_OUT:     "ปรับลด",
  TRANSFER:       "โอนย้าย",
  QC_FAIL:        "ไม่ผ่าน QC",
  REPAIR_OUT:     "ส่งซ่อม",
  REPAIR_IN:      "รับซ่อมคืน",
  DISASSEMBLY_OUT:"แยกชิ้นส่วน",
  DISASSEMBLY_IN: "ชิ้นส่วนเข้า",
};

export default async function DashboardPage() {
  const me = await getCurrentUser();
  const isAdmin = me?.role === "SUPERADMIN" || me?.role === "ADMIN";
  const noDepartments = !isAdmin && (me?.departments ?? []).length === 0;

  // Empty state — user has no departments yet
  if (noDepartments) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-10 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
              <Lock className="h-7 w-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold">รออนุมัติฝ่ายงาน</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              สวัสดีคุณ <span className="font-medium text-foreground">{me?.full_name}</span>
              <br />
              บัญชีของคุณยังไม่ได้รับการกำหนดฝ่ายที่รับผิดชอบ<br />
              กรุณาติดต่อ <span className="font-semibold text-red-600">Super Admin</span> เพื่อขอสิทธิ์เข้าถึงเมนู
            </p>
            <div className="rounded-lg border border-border bg-background px-4 py-3 text-left text-xs space-y-1.5">
              <p className="font-semibold">ข้อมูลบัญชี</p>
              <p>อีเมล: <span className="font-mono text-muted-foreground">{me?.email}</span></p>
              <p>สิทธิ์ปัจจุบัน: <span className="text-muted-foreground">{me?.role}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = await getDashboardStats();

  const primaryCards = [
    { key: "totalItems"    as const, label: "สต็อกทั้งหมด (ชิ้น)",       icon: Package,       color: "text-blue-600",   href: "/inventory"  },
    { key: "pendingOrders" as const, label: "คำสั่งซื้อรอดำเนินการ",      icon: ClipboardList, color: "text-red-500",    href: "/orders"     },
    { key: "shippedToday"  as const, label: "จัดส่งวันนี้",               icon: Truck,         color: "text-green-600",  href: "/shipping"   },
    { key: "lowStockCount" as const, label: "สินค้าตั้งค่าขั้นต่ำ",       icon: AlertTriangle, color: "text-amber-600",  href: "/reports"    },
  ];

  const alertCards = [
    { key: "pendingRepairs"  as const, label: "งานซ่อมค้าง",       icon: Wrench,     color: "text-blue-600",   href: "/repair"      },
    { key: "pendingQC"       as const, label: "รอ QC",              icon: FlaskConical, color: "text-purple-600", href: "/qc"          },
    { key: "pendingCertify"  as const, label: "รอตีตรา",            icon: Stamp,      color: "text-orange-600", href: "/certify"     },
    { key: "pendingExchange" as const, label: "รอแลกเครื่อง",       icon: RefreshCcw, color: "text-cyan-600",   href: "/exchange"    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome + user's departments */}
      {!isAdmin && me && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">ฝ่ายของคุณ:</span>
          {me.departments.map((d) => (
            <span key={d} className={`rounded border px-2 py-0.5 font-semibold ${DEPARTMENT_COLORS[d]}`}>
              {DEPARTMENT_LABELS[d]}
            </span>
          ))}
        </div>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-4 gap-4">
        {primaryCards.map((card) => (
          <Link key={card.key} href={card.href}>
            <Card className="hover:border-border/80 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${card.color}`}>{stats[card.key].toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alert cards — งานค้าง */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">งานที่ต้องดำเนินการ</h3>
        <div className="grid grid-cols-4 gap-4">
          {alertCards.map((card) => {
            const count = stats[card.key];
            const hasAlert = count > 0;
            return (
              <Link key={card.key} href={card.href}>
                <Card className={`hover:border-border/80 transition-colors cursor-pointer ${hasAlert ? "border-border" : "opacity-60"}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${hasAlert ? card.color : "text-muted-foreground"}`}>
                      {count.toLocaleString()}
                    </p>
                    {hasAlert && (
                      <p className="mt-1 text-xs text-red-500 font-medium">ต้องดำเนินการ</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">ความเคลื่อนไหวสินค้าล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีความเคลื่อนไหว</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="w-28 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-xs text-muted-foreground">
                    {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                  </span>
                  <span className="flex-1 font-medium">{m.product.name}</span>
                  <span className="text-muted-foreground text-xs">{m.user.full_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(m.performed_at).toLocaleString("th-TH")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
