"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "ร่าง",
  ISSUED:    "เรียกเก็บแล้ว",
  PAID:      "ชำระแล้ว",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  ISSUED:    "bg-amber-500/10 text-amber-600",
  PAID:      "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  reason: string;
  total_amount: string;
  due_date: string | null;
  created_at: string;
  customer: { name: string; code: string } | null;
  _count:   { lines: number };
};

export default function InvoicesPage() {
  const { data, isLoading } = useSWR<Invoice[]>("/api/invoices", fetcher, { refreshInterval: 30000 });
  const invoices = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ใบแจ้งหนี้</h2>
          <p className="text-xs text-muted-foreground">เรียกเก็บค่าอะไหล่ / Invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          ออกใบแจ้งหนี้
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รายละเอียด</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดเงิน</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ครบกำหนด</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const overdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "PAID" && inv.status !== "CANCELLED";
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-medium text-red-600 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{inv.customer?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate">{inv.reason}</td>
                      <td className="px-4 py-3 text-right">{inv._count.lines}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        ฿{Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-xs ${overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                        {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}
                        {overdue && " (เลย)"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[inv.status]}`}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">ยังไม่มีใบแจ้งหนี้</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
