"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IntakeBanner } from "@/components/intake/IntakeBanner";
import { TicketBasicsCard } from "@/components/intake/TicketBasicsCard";
import { buildIntakeNotes } from "@/lib/ticket-types";

export default function NewClaimPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [productId,  setProductId]  = useState("");
  const [orderId,    setOrderId]    = useState("");
  const [serial,     setSerial]     = useState("");
  const [issueDesc,  setIssueDesc]  = useState("");
  const [inspection, setInspection] = useState("");
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDesc.trim()) { setError("ระบุอาการ/ปัญหาที่ลูกค้าแจ้ง"); return; }
    setError(""); setSubmitting(true);

    const extra = [serial ? `S/N: ${serial}` : "", notes].filter(Boolean).join("\n");

    const res = await fetch("/api/service-tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId || null,
        product_id:  productId  || null,
        order_id:    orderId    || null,
        issue_desc:  issueDesc,
        inspection:  inspection || null,
        notes:       buildIntakeNotes("CLAIM", extra),
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
        <h2 className="text-lg font-semibold">รับเคลมจากลูกค้า</h2>
      </div>

      <IntakeBanner>
        เคสนี้จะเข้าคิว <strong>Admin QC</strong> เพื่อตัดสินว่า ผ่าน → ออกใบลดหนี้+โอนเงินคืน / ไม่ผ่าน → ออกใบแจ้งหนี้ค่าอะไหล่
      </IntakeBanner>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <TicketBasicsCard
          title="ข้อมูลลูกค้า + เครื่อง"
          customerId={customerId} productId={productId} orderId={orderId}
          onCustomerChange={setCustomerId} onProductChange={setProductId} onOrderChange={setOrderId}
          extraField={
            <div className="space-y-1.5">
              <Label className="text-xs">S/N เครื่อง (ถ้ามี)</Label>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="เลขซีเรียล" />
            </div>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-sm">อาการ / ปัญหา</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">อาการที่ลูกค้าแจ้ง *</Label>
              <Textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="เช่น เครื่องไม่ติด, มีเสียงดังผิดปกติ" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สภาพเครื่องตอนรับเข้า (ผู้รับบันทึก)</Label>
              <Textarea value={inspection} onChange={(e) => setInspection(e.target.value)}
                placeholder="ผ้าสะอาด/มีรอย/มีกล่อง/ไม่มีกล่อง ฯลฯ" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุเพิ่มเติม</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
          <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
            {submitting ? "กำลังบันทึก..." : "เปิดเคสเคลม"}
          </Button>
        </div>
      </form>
    </div>
  );
}
