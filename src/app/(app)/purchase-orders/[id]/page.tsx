"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "ร่าง",
  SENT:      "ส่งแล้ว",
  PARTIAL:   "รับบางส่วน",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  SENT:      "bg-blue-500/10 text-blue-600",
  PARTIAL:   "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

const NEXT_STATUS: Record<string, { label: string; value: string; class: string }> = {
  DRAFT:   { label: "ส่ง PO",        value: "SENT",      class: "bg-blue-600 hover:bg-blue-700 text-white" },
  SENT:    { label: "รับบางส่วน",   value: "PARTIAL",   class: "bg-amber-500 hover:bg-amber-600 text-white" },
  PARTIAL: { label: "รับครบ / เสร็จ", value: "COMPLETED", class: "bg-green-600 hover:bg-green-700 text-white" },
};

type POLine = {
  id: string;
  product: { sku: string; name: string; unit: string };
  qty_ordered: string;
  qty_received: string;
  unit_price: string;
  notes: string | null;
};

type PO = {
  id: string;
  po_number: string;
  status: string;
  supplier: { code: string; name: string; phone: string | null; email: string | null };
  creator: { full_name: string };
  approver: { full_name: string } | null;
  expected_date: string | null;
  reference_doc: string | null;
  notes: string | null;
  total_amount: string | null;
  created_at: string;
  transit_status: string;
  shipped_at: string | null;
  in_transit_at: string | null;
  arrived_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  lines: POLine[];
};

const TRANSIT_STEPS = [
  { value: "NOT_SHIPPED", label: "ยังไม่ส่ง",    icon: "📋" },
  { value: "IN_TRANSIT",  label: "กำลังเดินทาง", icon: "🚚" },
  { value: "ARRIVED",     label: "ถึงคลังแล้ว",   icon: "✅" },
];

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR(`/api/purchase-orders/${id}`, fetcher);
  const po: PO | null = data && !data.error ? data : null;

  const [acting, setActing] = useState(false);

  async function changeStatus(status: string) {
    setActing(true);
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await mutate();
    setActing(false);
  }

  async function changeTransit(transit_status: string) {
    setActing(true);
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transit_status }),
    });
    await mutate();
    setActing(false);
  }

  async function updateTracking(carrier: string, tracking_number: string) {
    setActing(true);
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier, tracking_number }),
    });
    await mutate();
    setActing(false);
  }

  async function cancelPO() {
    if (!confirm("ยืนยันการยกเลิก PO นี้?")) return;
    setActing(true);
    await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
    router.push("/purchase-orders");
    router.refresh();
  }

  if (isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!po) return <div className="py-10 text-center text-sm text-destructive">ไม่พบ PO นี้</div>;

  const nextStep = NEXT_STATUS[po.status];
  const canCancel = po.status === "DRAFT" || po.status === "SENT";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </Link>
        <h2 className="text-lg font-semibold">{po.po_number}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[po.status]}`}>
          {STATUS_LABELS[po.status]}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`/print/purchase-orders/${id}`} target="_blank">
            <Button className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80">
              🖨️ พิมพ์
            </Button>
          </Link>
          {nextStep && (
            <Button
              onClick={() => changeStatus(nextStep.value)}
              disabled={acting}
              className={`h-8 text-xs font-semibold ${nextStep.class}`}
            >
              {nextStep.label}
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={cancelPO}
              disabled={acting}
              className="h-8 text-xs bg-muted text-foreground hover:bg-red-500/10 hover:text-red-600"
            >
              ยกเลิก PO
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลใบสั่งซื้อ</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">เลข PO</span>
              <span className="font-mono font-semibold">{po.po_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">วันที่สร้าง</span>
              <span>{format(new Date(po.created_at), "dd/MM/yyyy HH:mm")}</span>
            </div>
            {po.expected_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">กำหนดรับสินค้า</span>
                <span>{format(new Date(po.expected_date), "dd/MM/yyyy")}</span>
              </div>
            )}
            {po.reference_doc && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">เอกสารอ้างอิง</span>
                <span className="font-mono text-xs">{po.reference_doc}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">สร้างโดย</span>
              <span>{po.creator.full_name}</span>
            </div>
            {po.approver && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">อนุมัติโดย</span>
                <span>{po.approver.full_name}</span>
              </div>
            )}
            {po.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs">หมายเหตุ</p>
                <p className="mt-0.5">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier */}
        <Card>
          <CardHeader><CardTitle className="text-sm">ผู้จัดหา</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{po.supplier.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{po.supplier.code}</p>
            {po.supplier.phone && (
              <p className="text-muted-foreground">โทร: {po.supplier.phone}</p>
            )}
            {po.supplier.email && (
              <p className="text-muted-foreground">{po.supplier.email}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">รายการสินค้า</CardTitle>
            <span className="text-sm font-bold text-red-600">
              รวม ฿{po.total_amount ? Number(po.total_amount).toLocaleString() : "0"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">สินค้า</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">สั่ง</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">รับแล้ว</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">ราคา/หน่วย</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">รวม</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => {
                const total = Number(line.qty_ordered) * Number(line.unit_price);
                const remaining = Number(line.qty_ordered) - Number(line.qty_received);
                return (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{line.product.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{line.product.sku}</td>
                    <td className="px-4 py-2 text-right">
                      {Number(line.qty_ordered).toLocaleString()} {line.product.unit}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={Number(line.qty_received) >= Number(line.qty_ordered) ? "text-green-600 font-medium" : ""}>
                        {Number(line.qty_received).toLocaleString()}
                      </span>
                      {remaining > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">(คงเหลือ {remaining})</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">฿{Number(line.unit_price).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">฿{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Transit Tracking */}
      {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">การขนส่ง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stepper */}
            <div className="flex items-center justify-between">
              {TRANSIT_STEPS.map((step, idx) => {
                const currentIdx = TRANSIT_STEPS.findIndex((s) => s.value === po.transit_status);
                const isActive   = idx <= currentIdx;
                return (
                  <div key={step.value} className="flex flex-1 items-center">
                    <button
                      onClick={() => changeTransit(step.value)}
                      disabled={acting || idx < currentIdx}
                      className={`flex flex-col items-center gap-1 ${idx < currentIdx ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${
                        isActive ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {step.icon}
                      </div>
                      <span className={`text-xs ${isActive ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</span>
                    </button>
                    {idx < TRANSIT_STEPS.length - 1 && (
                      <div className={`mx-2 h-0.5 flex-1 ${idx < currentIdx ? "bg-red-600" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Carrier + tracking */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">ผู้ขนส่ง</label>
                <input
                  type="text"
                  defaultValue={po.carrier ?? ""}
                  placeholder="Kerry / Flash / DHL …"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  onBlur={(e) => {
                    if (e.target.value !== (po.carrier ?? "")) updateTracking(e.target.value, po.tracking_number ?? "");
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">เลข Tracking</label>
                <input
                  type="text"
                  defaultValue={po.tracking_number ?? ""}
                  placeholder="TH1234567890"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  onBlur={(e) => {
                    if (e.target.value !== (po.tracking_number ?? "")) updateTracking(po.carrier ?? "", e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">วันที่ส่ง</p>
                <p>{po.shipped_at ? format(new Date(po.shipped_at), "dd MMM yyyy HH:mm") : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">เริ่มเดินทาง</p>
                <p>{po.in_transit_at ? format(new Date(po.in_transit_at), "dd MMM yyyy HH:mm") : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">มาถึงคลัง</p>
                <p className={po.arrived_at ? "text-green-600 font-medium" : ""}>
                  {po.arrived_at ? format(new Date(po.arrived_at), "dd MMM yyyy HH:mm") : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link to receiving */}
      {(po.status === "SENT" || po.status === "PARTIAL") && (
        <Card className="border-blue-200 bg-blue-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">พร้อมรับสินค้าเข้าคลัง?</p>
              <p className="text-xs text-muted-foreground mt-0.5">สร้างงานรับเข้าและอ้างอิง PO {po.po_number}</p>
            </div>
            <Link href={`/receiving/new?po=${po.po_number}&ref=${po.po_number}`}>
              <Button className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                สร้างงานรับเข้า →
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
