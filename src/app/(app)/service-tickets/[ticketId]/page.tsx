"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
const RESOLUTIONS = [
  { value: "REPAIR",             label: "ส่งซ่อม"        },
  { value: "EXCHANGE",           label: "เปลี่ยนเครื่อง" },
  { value: "REFUND",             label: "คืนเงิน"        },
  { value: "RETURN_TO_CUSTOMER", label: "ส่งคืนลูกค้า"   },
  { value: "REJECTED",           label: "ปฏิเสธเคส"      },
];

export default function ServiceTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();
  const { data: ticket, mutate, isLoading } = useSWR(`/api/service-tickets/${ticketId}`, fetcher);

  const [resolution, setResolution] = useState("");
  const [acting, setActing] = useState(false);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!ticket || ticket.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบเคส</div>;

  async function update(payload: Record<string, unknown>) {
    setActing(true);
    await fetch(`/api/service-tickets/${ticketId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await mutate();
    setActing(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/service-tickets")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">{ticket.ticket_number}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">ลูกค้า</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{ticket.customer?.name ?? "—"}</p>
            {ticket.customer?.phone && <p className="text-muted-foreground">{ticket.customer.phone}</p>}
            {ticket.customer?.email && <p className="text-muted-foreground">{ticket.customer.email}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">สินค้า</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {ticket.product ? (
              <>
                <p className="font-semibold">{ticket.product.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{ticket.product.sku}</p>
              </>
            ) : <p className="text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">ปัญหา / การตรวจสภาพ</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">ปัญหา</p>
            <p className="mt-1">{ticket.issue_desc}</p>
          </div>
          {ticket.inspection && (
            <div>
              <p className="text-xs text-muted-foreground">ผลการตรวจ</p>
              <p className="mt-1">{ticket.inspection}</p>
            </div>
          )}
          {ticket.notes && (
            <div>
              <p className="text-xs text-muted-foreground">หมายเหตุ</p>
              <p className="mt-1">{ticket.notes}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
            <div>
              <p className="text-muted-foreground">รับเรื่อง</p>
              <p>{ticket.receiver?.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">วันที่เปิด</p>
              <p>{format(new Date(ticket.created_at), "dd MMM yyyy HH:mm")}</p>
            </div>
            {ticket.closed_at && (
              <div>
                <p className="text-muted-foreground">วันที่ปิด</p>
                <p>{format(new Date(ticket.closed_at), "dd MMM yyyy HH:mm")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {(ticket.status === "OPEN" || ticket.status === "IN_REVIEW") && (
        <Card className="border-red-200 bg-red-500/5">
          <CardHeader><CardTitle className="text-sm">ดำเนินการ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ticket.status === "OPEN" && (
              <Button
                onClick={() => update({ status: "IN_REVIEW" })}
                disabled={acting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                เริ่มตรวจสอบ
              </Button>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium">เลือกการแก้ปัญหา + ปิดเคส</p>
              <div className="grid grid-cols-2 gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                      resolution === r.value ? "border-red-600 bg-red-600/10 text-red-600 font-semibold" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => update({ status: "CLOSED", resolution })}
                disabled={acting || !resolution}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                ปิดเคส
              </Button>
              <Button
                onClick={() => update({ status: "CANCELLED" })}
                disabled={acting}
                className="w-full bg-muted text-foreground hover:bg-red-500/10 hover:text-red-600"
              >
                ยกเลิกเคส
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
