"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { INTAKE_STATUS_LABELS, TICKET_STATUS_COLORS } from "@/lib/ticket-labels";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Ticket = {
  id: string;
  ticket_number: string;
  status: string;
  resolution: string | null;
  issue_desc: string;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  customer: { name: string; phone: string | null } | null;
  product: { name: string; sku: string } | null;
};

type Props = {
  pageTitle: string;
  pageSubtitle: string;
  newHref: string;
  newButtonLabel: string;
  issueColumnLabel: string;
  resolutionLabels: Record<string, string>;
  /** filter predicate against notes prefix */
  filter: (t: Ticket) => boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
};

export function IntakeTicketList({
  pageTitle, pageSubtitle, newHref, newButtonLabel, issueColumnLabel,
  resolutionLabels, filter, emptyIcon, emptyText,
}: Props) {
  const { data, isLoading } = useSWR<Ticket[]>("/api/service-tickets", fetcher, { refreshInterval: 30000 });
  const tickets = (Array.isArray(data) ? data : []).filter(filter);
  const open    = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_REVIEW");
  const closed  = tickets.filter((t) => t.status === "CLOSED" || t.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{pageTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {pageSubtitle} — รอ Admin QC: {open.length} รายการ
          </p>
        </div>
        <Link
          href={newHref}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> {newButtonLabel}
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="mx-auto mb-3 opacity-30">{emptyIcon}</div>
            <p>{emptyText}</p>
            <p className="text-xs mt-1">กด "{newButtonLabel}" เพื่อเปิดเคส</p>
          </CardContent>
        </Card>
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{issueColumnLabel}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">รับเข้า</th>
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
                          {format(new Date(t.created_at), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TICKET_STATUS_COLORS[t.status]}`}>
                            {INTAKE_STATUS_LABELS[t.status]}
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
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ผล Admin QC</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ปิดเคส</th>
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
                          <td className="px-4 py-2 text-muted-foreground">{t.resolution ? resolutionLabels[t.resolution] : "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {t.closed_at ? format(new Date(t.closed_at), "dd MMM yyyy") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
