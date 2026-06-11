import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ClipboardCheck, Stamp } from "lucide-react";
import { CLAIM_MARKER, RETURN_MARKER } from "@/lib/ticket-types";
import { TICKET_STATUS_COLORS, INTAKE_STATUS_LABELS } from "@/lib/ticket-labels";

type SearchParams = { view?: string };

const RESULT_COLORS: Record<string, string> = {
  PENDING: "bg-red-600/10 text-red-600",
  PASS:    "bg-green-500/10 text-green-600",
  FAIL:    "bg-red-500/10 text-red-600",
};

const RESULT_LABELS: Record<string, string> = {
  PENDING: "รอตรวจสอบ",
  PASS:    "ผ่าน",
  FAIL:    "ไม่ผ่าน",
};

async function getProductionQc() {
  return prisma.qcRecord.findMany({
    include: {
      inspector:      { select: { full_name: true } },
      receiving_job:  { select: { job_number: true } },
      production_job: { select: { job_number: true } },
      product:        { select: { name: true, sku: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });
}

async function getAdminQcTickets() {
  return prisma.serviceTicket.findMany({
    where: {
      status: { in: ["OPEN", "IN_REVIEW"] },
      OR: [
        { notes: { startsWith: CLAIM_MARKER } },
        { notes: { startsWith: RETURN_MARKER } },
      ],
    },
    include: {
      customer: { select: { name: true, phone: true } },
      product:  { select: { name: true, sku: true } },
      receiver: { select: { full_name: true } },
    },
    orderBy: { created_at: "asc" },
  });
}

export default async function QcPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = sp.view === "admin" ? "admin" : "production";

  // Counts for tab badges
  const [pendingProd, pendingAdmin] = await Promise.all([
    prisma.qcRecord.count({ where: { result: "PENDING" } }),
    prisma.serviceTicket.count({
      where: {
        status: { in: ["OPEN", "IN_REVIEW"] },
        OR: [
          { notes: { startsWith: CLAIM_MARKER } },
          { notes: { startsWith: RETURN_MARKER } },
        ],
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ตรวจสอบคุณภาพ (QC)</h2>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border bg-card p-0.5 w-fit">
        <TabLink
          href="/qc"
          active={view === "production"}
          label="Production / Receiving QC"
          icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          count={pendingProd}
        />
        <TabLink
          href="/qc?view=admin"
          active={view === "admin"}
          label="Admin QC (Claim/Return)"
          icon={<Stamp className="h-3.5 w-3.5" />}
          count={pendingAdmin}
        />
      </div>

      {view === "production" ? <ProductionView /> : <AdminView />}
    </div>
  );
}

function TabLink({
  href, active, label, icon, count,
}: {
  href: string; active: boolean; label: string; icon: React.ReactNode; count: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-red-600 text-white" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
      {count > 0 && (
        <span className={`rounded-full px-1.5 text-[10px] ${
          active ? "bg-white/20" : "bg-red-600/10 text-red-600"
        }`}>
          {count}
        </span>
      )}
    </Link>
  );
}

async function ProductionView() {
  const records = await getProductionQc();
  const pending  = records.filter((r) => r.result === "PENDING");
  const reviewed = records.filter((r) => r.result !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">รอตรวจสอบ</h3>
          <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-500">
            {pending.length} รายการ
          </span>
        </div>

        {pending.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">ไม่มีรายการรอตรวจสอบ</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">อ้างอิง</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">จำนวนตรวจ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้ตรวจ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.product.name}</p>
                        <p className="text-xs text-muted-foreground">{r.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.receiving_job?.job_number ?? r.production_job?.job_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{Number(r.qty_inspected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.inspector.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd MMM yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT_COLORS[r.result]}`}>
                          {RESULT_LABELS[r.result]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/qc/${r.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                          ตรวจสอบ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">ตรวจสอบแล้ว</h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">อ้างอิง</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">ผ่าน</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">ไม่ผ่าน</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้ตรวจ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่ตรวจ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewed.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/qc/${r.id}`} className="font-medium hover:text-red-500">{r.product.name}</Link>
                        <p className="text-xs text-muted-foreground">{r.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.receiving_job?.job_number ?? r.production_job?.job_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">{Number(r.qty_passed).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-600">{Number(r.qty_failed).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.inspector.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.inspected_at ? format(new Date(r.inspected_at), "dd MMM yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT_COLORS[r.result]}`}>
                          {RESULT_LABELS[r.result]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

async function AdminView() {
  const tickets = await getAdminQcTickets();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Service Ticket รอ Admin QC</h3>
          <p className="text-[11px] text-muted-foreground/80">
            ตัดสินใจ ผ่าน/ไม่ผ่าน → ออก CN, ใบแจ้งหนี้ค่าอะไหล่, แลกเครื่อง, ส่งซ่อม, หรือคืนลูกค้า
          </p>
        </div>
        <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-500">
          {tickets.length} รายการ
        </span>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stamp className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>ไม่มีเคสรอ Admin QC</p>
            <p className="text-xs mt-1">เคสจาก <Link href="/claims" className="text-red-600 hover:underline">รับเคลม</Link> และ <Link href="/returns" className="text-red-600 hover:underline">รับสินค้าส่งคืน</Link> จะมาที่นี่</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขเคส</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ที่มา</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">อาการ/เหตุผล</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รับเข้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const isClaim = t.notes?.startsWith(CLAIM_MARKER);
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/service-tickets/${t.id}`} className="font-mono text-xs font-semibold text-red-600 hover:underline">
                          {t.ticket_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isClaim ? "bg-amber-500/10 text-amber-700" : "bg-blue-500/10 text-blue-700"
                        }`}>
                          {isClaim ? "เคลม" : "คืนสินค้า"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.customer?.name ?? "—"}</p>
                        {t.customer?.phone && <p className="text-[11px] text-muted-foreground">{t.customer.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {t.product ? (
                          <>
                            <p className="font-medium">{t.product.name}</p>
                            <p className="text-[11px] text-muted-foreground">{t.product.sku}</p>
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs">{t.issue_desc}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(t.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TICKET_STATUS_COLORS[t.status]}`}>
                          {INTAKE_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/service-tickets/${t.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                          ทำ Admin QC
                        </Link>
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
