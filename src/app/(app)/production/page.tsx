import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

async function getJobs() {
  return prisma.productionJob.findMany({
    include: {
      product: { select: { name: true, sku: true } },
      assigned_user: { select: { full_name: true } },
    },
    orderBy: [
      { priority: "desc" }, // URGENT > NORMAL > LOW
      { created_at: "desc" },
    ],
    take: 50,
  });
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 border-red-500/40",
  NORMAL: "bg-muted text-muted-foreground border-border",
  LOW:    "bg-blue-500/10 text-blue-600 border-blue-500/40",
};
const PRIORITY_LABEL: Record<string, string> = {
  URGENT: "ด่วนมาก",
  NORMAL: "ปกติ",
  LOW:    "ทั่วไป",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-red-600/10 text-red-600",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  FAILED:      "bg-red-500/10 text-red-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "รอดำเนินการ",
  IN_PROGRESS: "กำลังผลิต",
  COMPLETED:   "เสร็จสิ้น",
  FAILED:      "ล้มเหลว",
  CANCELLED:   "ยกเลิก",
};

const TYPE_LABELS: Record<string, string> = {
  ASSEMBLY:    "ประกอบ",
  DISASSEMBLY: "แยกชิ้นส่วน",
  REPAIR:      "ซ่อม",
};

export default async function ProductionPage() {
  const jobs = await getJobs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">งานผลิต</h2>
        <Link
          href="/production/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-3.5 w-3.5" />
          สร้างงานผลิต
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภท</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">จำนวนผลิต</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ผลผลิต</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/production/${job.id}`}
                        className="font-mono text-xs font-medium text-red-600 hover:underline"
                      >
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[job.job_type] ?? job.job_type}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium">{job.product.name}</p>
                          <p className="text-xs text-muted-foreground">{job.product.sku}</p>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className={`rounded border px-1.5 py-0 text-[10px] font-semibold ${PRIORITY_BADGE[job.priority]}`}>
                            {job.priority === "URGENT" && "🚨 "}{PRIORITY_LABEL[job.priority]}
                          </span>
                          {job.should_certify && (
                            <span className="rounded bg-orange-500/10 text-orange-600 border border-orange-500/40 px-1.5 py-0 text-[10px] font-semibold">
                              ตีตรา
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{Number(job.qty_planned).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {Number(job.qty_produced).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {job.assigned_user?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(job.created_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[job.status] ?? ""}`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      ยังไม่มีงานผลิต
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
