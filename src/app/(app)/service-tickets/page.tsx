"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  OPEN:      "เปิดเคส",
  IN_REVIEW: "กำลังตรวจ",
  CLOSED:    "ปิดเคส",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-red-500/10 text-red-600",
  IN_REVIEW: "bg-amber-500/10 text-amber-600",
  CLOSED:    "bg-green-500/10 text-green-600",
  CANCELLED: "bg-muted text-muted-foreground",
};
const RESOLUTION_LABELS: Record<string, string> = {
  REPAIR:             "ส่งซ่อม",
  EXCHANGE:           "เปลี่ยนเครื่อง",
  REFUND:             "คืนเงิน",
  RETURN_TO_CUSTOMER: "ส่งคืนลูกค้า",
  REJECTED:           "ปฏิเสธเคส",
};

type Ticket = {
  id: string;
  ticket_number: string;
  status: string;
  resolution: string | null;
  issue_desc: string;
  created_at: string;
  closed_at: string | null;
  customer: { name: string; phone: string | null } | null;
  product: { name: string; sku: string } | null;
  receiver: { full_name: string };
};

export default function ServiceTicketsPage() {
  const { data, isLoading } = useSWR<Ticket[]>("/api/service-tickets", fetcher, { refreshInterval: 30000 });
  const tickets = Array.isArray(data) ? data : [];
  const open    = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_REVIEW");
  const closed  = tickets.filter((t) => t.status === "CLOSED" || t.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">บริการหลังการขาย</h2>
          <p className="text-xs text-muted-foreground">เปิดเคส: {open.length} รายการ</p>
        </div>
        <Link
          href="/service-tickets/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          เปิดเคสใหม่
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : (
        <>
          {open.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขเคส</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลูกค้า</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ปัญหา</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <Link href={`/service-tickets/${t.id}`} className="font-mono text-xs font-medium text-red-600 hover:underline">
                            {t.ticket_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{t.customer?.name ?? "—"}</p>
                          {t.customer?.phone && <p className="text-xs text-muted-foreground">{t.customer.phone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {t.product ? (
                            <>
                              <p className="font-medium">{t.product.name}</p>
                              <p className="text-xs text-muted-foreground">{t.product.sku}</p>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate">{t.issue_desc}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(t.created_at), "dd MMM yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                            {STATUS_LABELS[t.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {closed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">ประวัติ</h3>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">เลขเคส</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ลูกค้า</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">การแก้ปัญหา</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ปิดเคส</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closed.map((t) => (
                        <tr key={t.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <Link href={`/service-tickets/${t.id}`} className="font-mono text-xs text-red-600 hover:underline">
                              {t.ticket_number}
                            </Link>
                          </td>
                          <td className="px-4 py-2">{t.customer?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{t.resolution ? RESOLUTION_LABELS[t.resolution] : "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {t.closed_at ? format(new Date(t.closed_at), "dd MMM yyyy") : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                              {STATUS_LABELS[t.status]}
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

          {tickets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">ยังไม่มีเคสบริการ</CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
