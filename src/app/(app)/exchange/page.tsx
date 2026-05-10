"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "รอดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-muted text-muted-foreground",
};

type ExchangeJob = {
  id: string;
  job_number: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
  new_product: { name: string; sku: string };
  old_product: { name: string; sku: string };
  customer: { name: string } | null;
  handler: { full_name: string };
};

export default function ExchangePage() {
  const { data, mutate, isLoading } = useSWR<ExchangeJob[]>("/api/exchange", fetcher, { refreshInterval: 15000 });
  const [working, setWorking] = useState<string | null>(null);
  const [error,   setError]   = useState("");

  const jobs: ExchangeJob[] = Array.isArray(data) ? data : [];
  const pending  = jobs.filter((j) => j.status === "PENDING");
  const finished = jobs.filter((j) => j.status !== "PENDING");

  async function act(jobId: string, action: string) {
    setError(""); setWorking(jobId);
    const res = await fetch(`/api/exchange/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "เกิดข้อผิดพลาด");
    await mutate();
    setWorking(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">แลกเปลี่ยนเครื่อง</h2>
          <p className="text-xs text-muted-foreground">รอดำเนินการ: {pending.length} รายการ</p>
        </div>
        <Link
          href="/exchange/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          สร้างงานแลกเปลี่ยน
        </Link>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : (
        <>
          {pending.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขงาน</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">เครื่องใหม่ (ออก)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">เครื่องเก่า (รับคืน)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((j) => (
                      <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{j.job_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-green-600">{j.new_product.name}</p>
                          <p className="text-xs text-muted-foreground">{j.new_product.sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-amber-600">{j.old_product.name}</p>
                          <p className="text-xs text-muted-foreground">{j.old_product.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.customer?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(j.created_at), "dd MMM yyyy")}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status]}`}>
                            {STATUS_LABELS[j.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => act(j.id, "complete")}
                              disabled={working === j.id}
                              title="เสร็จสิ้น"
                              className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => act(j.id, "cancel")}
                              disabled={working === j.id}
                              title="ยกเลิก"
                              className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
              <h3 className="text-sm font-semibold text-muted-foreground">ประวัติ</h3>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">เลขงาน</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">เครื่องใหม่</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ลูกค้า</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">วันที่</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finished.map((j) => (
                        <tr key={j.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-mono text-xs">{j.job_number}</td>
                          <td className="px-4 py-2 font-medium">{j.new_product.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{j.customer?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{format(new Date(j.created_at), "dd MMM yyyy")}</td>
                          <td className="px-4 py-2">
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
              <CardContent className="py-12 text-center text-muted-foreground">ยังไม่มีงานแลกเปลี่ยน</CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
