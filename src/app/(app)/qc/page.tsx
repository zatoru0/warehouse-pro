import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

async function getQcRecords() {
  return prisma.qcRecord.findMany({
    include: {
      inspector: { select: { full_name: true } },
      receiving_job: { select: { job_number: true } },
      production_job: { select: { job_number: true } },
      product: { select: { name: true, sku: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });
}

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

export default async function QcPage() {
  const records = await getQcRecords();

  const pending = records.filter((r) => r.result === "PENDING");
  const reviewed = records.filter((r) => r.result !== "PENDING");

  return (
    <div className="space-y-6">
      {/* รอตรวจสอบ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ตรวจสอบคุณภาพ</h2>
          <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-500">
            รอตรวจสอบ {pending.length} รายการ
          </span>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              ไม่มีรายการรอตรวจสอบ
            </CardContent>
          </Card>
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
                        <Link
                          href={`/qc/${r.id}`}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
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

      {/* ตรวจสอบแล้ว */}
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
                        <Link href={`/qc/${r.id}`} className="font-medium hover:text-red-500">
                          {r.product.name}
                        </Link>
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
