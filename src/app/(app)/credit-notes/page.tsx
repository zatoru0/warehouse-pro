"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "ร่าง",
  ISSUED:    "ออกแล้ว",
  REFUNDED:  "คืนเงินแล้ว",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  ISSUED:    "bg-amber-500/10 text-amber-600",
  REFUNDED:  "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

type CN = {
  id: string;
  cn_number: string;
  status: string;
  reason: string;
  total_amount: string;
  created_at: string;
  customer: { name: string; code: string } | null;
  order:    { id: string; order_number: string } | null;
  _count:   { lines: number };
};

export default function CreditNotesPage() {
  const { data, isLoading } = useSWR<CN[]>("/api/credit-notes", fetcher, { refreshInterval: 30000 });
  const cns = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ใบลดหนี้</h2>
          <p className="text-xs text-muted-foreground">โอนเงินคืนลูกค้า / Credit Notes</p>
        </div>
        <Link
          href="/credit-notes/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          ออกใบลดหนี้
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เหตุผล</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดเงิน</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {cns.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/credit-notes/${c.id}`} className="font-mono text-xs font-medium text-red-600 hover:underline">
                        {c.cn_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{c.reason}</td>
                    <td className="px-4 py-3 text-right">{c._count.lines}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      ฿{Number(c.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {cns.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">ยังไม่มีใบลดหนี้</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
