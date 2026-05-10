"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  WAIT_REPAIR: "รอซ่อม",
  IN_REPAIR:   "กำลังซ่อม",
  WAIT_QC:     "รอ QC",
  COMPLETED:   "เสร็จสิ้น",
  CANCELLED:   "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  WAIT_REPAIR: "bg-amber-500/10 text-amber-600",
  IN_REPAIR:   "bg-blue-500/10 text-blue-600",
  WAIT_QC:     "bg-purple-500/10 text-purple-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};

type RepairJob = {
  id: string;
  job_number: string;
  status: string;
  issue_desc: string | null;
  created_at: string;
  product: { name: string; sku: string };
  customer: { name: string } | null;
  receiver: { full_name: string };
  assignee: { full_name: string } | null;
};

export default function RepairPage() {
  const { data, isLoading } = useSWR<RepairJob[]>("/api/repair", fetcher, { refreshInterval: 15000 });
  const jobs: RepairJob[] = Array.isArray(data) ? data : [];

  const active   = jobs.filter((j) => !["COMPLETED", "CANCELLED"].includes(j.status));
  const finished = jobs.filter((j) => ["COMPLETED", "CANCELLED"].includes(j.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">งานซ่อม</h2>
          <p className="text-xs text-muted-foreground">
            รอซ่อม / กำลังซ่อม: {active.length} รายการ
          </p>
        </div>
        <Link
          href="/repair/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          รับงานซ่อม
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : (
        <>
          {active.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขงาน</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">อาการ</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้รับงาน</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((j) => (
                      <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{j.job_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{j.product.name}</p>
                          <p className="text-xs text-muted-foreground">{j.product.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.customer?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{j.issue_desc ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{j.receiver.full_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(j.created_at), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status]}`}>
                            {STATUS_LABELS[j.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/repair/${j.id}`}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            ดำเนินการ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {finished.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">เสร็จสิ้น / ยกเลิก</h3>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขงาน</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finished.map((j) => (
                        <tr key={j.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">
                            <Link href={`/repair/${j.id}`} className="hover:text-red-500">{j.job_number}</Link>
                          </td>
                          <td className="px-4 py-3 font-medium">{j.product.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{j.customer?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {format(new Date(j.created_at), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status]}`}>
                              {STATUS_LABELS[j.status]}
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

          {jobs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                ยังไม่มีงานซ่อม
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
