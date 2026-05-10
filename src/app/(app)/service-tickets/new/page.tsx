"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Customer = { id: string; name: string; code: string };
type Product  = { id: string; name: string; sku: string };

export default function NewServiceTicketPage() {
  const router = useRouter();
  const { data: customersData } = useSWR("/api/customers", fetcher);
  const { data: productsRes }   = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);

  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];
  const products:  Product[]  = productsRes?.products ?? [];

  const [customerId, setCustomerId] = useState("");
  const [productId,  setProductId]  = useState("");
  const [issueDesc,  setIssueDesc]  = useState("");
  const [inspection, setInspection] = useState("");
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDesc.trim()) { setError("ระบุปัญหาที่พบ"); return; }
    setError(""); setSubmitting(true);

    const res = await fetch("/api/service-tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId || null,
        product_id:  productId  || null,
        issue_desc:  issueDesc,
        inspection:  inspection || null,
        notes:       notes      || null,
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
        <h2 className="text-lg font-semibold">เปิดเคสบริการหลังการขาย</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลลูกค้าและสินค้า</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ลูกค้า</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สินค้า</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={productId} onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">ปัญหาที่พบ *</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              rows={4}
              placeholder="ลูกค้าแจ้งว่า…"
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">การตรวจสภาพ (ถ้ามี)</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              rows={3}
              placeholder="ผลการตรวจสภาพเบื้องต้น…"
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">หมายเหตุ</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" onClick={() => router.back()} className="bg-muted hover:bg-muted/80 text-foreground">ยกเลิก</Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting}>
            {submitting ? "กำลังบันทึก…" : "เปิดเคส"}
          </Button>
        </div>
      </form>
    </div>
  );
}
