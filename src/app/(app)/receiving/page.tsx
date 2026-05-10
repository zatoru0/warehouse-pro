import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

async function getJobs() {
  return prisma.receivingJob.findMany({
    include: {
      receiver: { select: { full_name: true } },
      supplier: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-red-600/10 text-red-500",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED:   "เสร็จสิ้น",
  CANCELLED:   "ยกเลิก",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_GOODS: "สินค้าใหม่",
  CLAIM:     "เคลม",
  REPAIR:    "ซ่อม",
  PARTS:     "อะไหล่",
  RETURN:    "คืนสินค้า",
};

export default async function ReceivingPage() {
  const jobs = await getJobs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">งานรับสินค้า</h2>
        <Link
          href="/receiving/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-3.5 w-3.5" />
          รับสินค้าใหม่
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้จัดหา</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้รับสินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/receiving/${job.id}`}
                        className="font-mono text-xs font-medium text-red-500 hover:underline"
                      >
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[job.receiving_type] ?? job.receiving_type}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.supplier?.name ?? "—"}</td>
                    <td className="px-4 py-3">{job._count.lines}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.receiver.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(job.created_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[job.status] ?? ""}`}
                      >
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      ยังไม่มีงานรับสินค้า
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
