"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IntakeBanner } from "@/components/intake/IntakeBanner";
import { TicketBasicsCard } from "@/components/intake/TicketBasicsCard";
import { buildIntakeNotes } from "@/lib/ticket-types";

const RETURN_REASONS = [
  "ไม่ตรงปก / ไม่ตรงรุ่น",
  "ไม่พอใจสินค้า",
  "เครื่องชำรุดเมื่อรับ",
  "เปลี่ยนใจ / สั่งผิด",
  "อื่น ๆ",
];

export default function NewReturnPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [productId,  setProductId]  = useState("");
  const [orderId,    setOrderId]    = useState("");
  const [reason,     setReason]     = useState(RETURN_REASONS[0]);
  const [issueDesc,  setIssueDesc]  = useState("");
  const [inspection, setInspection] = useState("");
  const [hasBox,     setHasBox]     = useState(true);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDesc.trim()) { setError("ระบุรายละเอียดเหตุผลการคืน"); return; }
    setError(""); setSubmitting(true);

    const extra = [
      `เหตุผล: ${reason}`,
      `มีกล่อง/อุปกรณ์ครบ: ${hasBox ? "ใช่" : "ไม่"}`,
      notes,
    ].filter(Boolean).join("\n");

    const res = await fetch("/api/service-tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId || null,
        product_id:  productId  || null,
        order_id:    orderId    || null,
        issue_desc:  issueDesc,
        inspection:  inspection || null,
        notes:       buildIntakeNotes("RETURN", extra),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    router.push(`/service-tickets/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">รับสินค้าส่งคืนจากลูกค้า</h2>
      </div>

      <IntakeBanner>
        เคสนี้จะเข้าคิว <strong>Admin QC</strong> → ถ้าเสียจากลูกค้า: แลกเครื่อง / ถ้าเสียโดยสินค้า: เคลมรอซ่อม / ถ้าไม่เสีย: ส่งคืน
      </IntakeBanner>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <TicketBasicsCard
          title="ข้อมูลลูกค้า + คำสั่งซื้อ"
          customerId={customerId} productId={productId} orderId={orderId}
          onCustomerChange={setCustomerId} onProductChange={setProductId} onOrderChange={setOrderId}
          extraField={
            <div className="space-y-1.5">
              <Label className="text-xs">เหตุผลคืน</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={reason} onChange={(e) => setReason(e.target.value)}
              >
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-sm">รายละเอียดการคืน</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">รายละเอียดเพิ่มเติม *</Label>
              <Textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="ลูกค้าบอกอะไร / ปัญหาที่อ้าง / สิ่งที่ต้องตรวจ" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สภาพเครื่องตอนรับเข้า</Label>
              <Textarea value={inspection} onChange={(e) => setInspection(e.target.value)}
                placeholder="มีรอย/ขีดข่วน/สึกหรอ ฯลฯ" rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasBox} onChange={(e) => setHasBox(e.target.checked)} className="h-4 w-4" />
              <span>มีกล่อง/อุปกรณ์ครบ</span>
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
          <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
            {submitting ? "กำลังบันทึก..." : "เปิดเคสคืนสินค้า"}
          </Button>
        </div>
      </form>
    </div>
  );
}
