"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Customer = { id: string; name: string; code: string };
type Product  = { id: string; name: string; sku: string; sale_price: string | null };

type Line = {
  product_id: string;
  description: string;
  qty: number;
  unit_price: number;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: customersData } = useSWR("/api/customers", fetcher);
  const { data: productsRes }   = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);

  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];
  const products:  Product[]  = productsRes?.products ?? [];

  const [customerId, setCustomerId] = useState("");
  const [reason,     setReason]     = useState("");
  const [notes,      setNotes]      = useState("");
  const [dueDate,    setDueDate]    = useState("");
  const [lines,      setLines]      = useState<Line[]>([{ product_id: "", description: "", qty: 1, unit_price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const total = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function selectProduct(idx: number, productId: string) {
    const p = products.find((p) => p.id === productId);
    updateLine(idx, {
      product_id:  productId,
      description: p ? `${p.name} (${p.sku})` : "",
      unit_price:  p?.sale_price ? Number(p.sale_price) : 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("ระบุเหตุผลการเรียกเก็บ"); return; }
    if (lines.some((l) => !l.description.trim())) { setError("กรุณากรอกรายละเอียดทุกบรรทัด"); return; }
    setError(""); setSubmitting(true);

    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId || null,
        reason,
        notes:    notes    || null,
        due_date: dueDate  || null,
        lines: lines.map((l) => ({ ...l, product_id: l.product_id || null })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    router.push(`/invoices/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">ออกใบแจ้งหนี้</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลทั่วไป</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">ลูกค้า</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">เหตุผล / รายละเอียด *</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ค่าอะไหล่ซ่อมเครื่อง…" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">วันครบกำหนดชำระ</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">รายการ</CardTitle>
              <Button
                type="button"
                onClick={() => setLines((prev) => [...prev, { product_id: "", description: "", qty: 1, unit_price: 0 }])}
                className="h-7 text-xs bg-muted hover:bg-muted/80 text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" /> เพิ่ม
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_60px_1fr_30px] gap-2 items-end">
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">สินค้า / รายละเอียด</Label>}
                  <select
                    className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    value={line.product_id}
                    onChange={(e) => selectProduct(idx, e.target.value)}
                  >
                    <option value="">-- กรอกรายละเอียดเอง --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="รายละเอียด"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">ราคา/หน่วย</Label>}
                  <Input
                    type="number" step="any" min="0"
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                    className="h-8 text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">จำนวน</Label>}
                  <Input
                    type="number" step="any" min="0"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                    className="h-8 text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">รวม</Label>}
                  <p className="h-8 text-xs text-right pt-2 font-medium">฿{(line.qty * line.unit_price).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={lines.length === 1}
                  className="h-8 rounded-lg p-1 text-muted-foreground hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
              <span className="text-sm font-semibold">ยอดเงินรวม</span>
              <span className="text-lg font-bold text-red-600">฿{total.toLocaleString()}</span>
            </div>
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
            {submitting ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </div>
      </form>
    </div>
  );
}
