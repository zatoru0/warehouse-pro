"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Supplier = { id: string; code: string; name: string };
type Product  = { id: string; sku: string; name: string; unit: string; cost_price: string | null };

type Line = { product_id: string; qty_ordered: string; unit_price: string; notes: string };

const emptyLine = (): Line => ({ product_id: "", qty_ordered: "1", unit_price: "0", notes: "" });

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: suppliersData } = useSWR("/api/suppliers", fetcher);
  const { data: productsRes }   = useSWR("/api/products?limit=200", fetcher);

  const suppliers: Supplier[] = Array.isArray(suppliersData) ? suppliersData : [];
  const products:  Product[]  = Array.isArray(productsRes?.products) ? productsRes.products : [];

  const [supplierId,   setSupplierId]   = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [referenceDoc, setReferenceDoc] = useState("");
  const [notes,        setNotes]        = useState("");
  const [lines,        setLines]        = useState<Line[]>([emptyLine()]);
  const [error,        setError]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [prefilled,    setPrefilled]    = useState(false);

  // Pre-fill lines from /inventory/reorder via ?lines=<id>:<qty>:<price>,...
  useEffect(() => {
    if (prefilled) return;
    const raw = searchParams.get("lines");
    if (!raw) return;
    const parsed: Line[] = raw.split(",").map((seg) => {
      const [product_id, qty_ordered, unit_price] = seg.split(":");
      return {
        product_id: product_id ?? "",
        qty_ordered: qty_ordered ?? "1",
        unit_price:  unit_price  ?? "0",
        notes: "",
      };
    }).filter((l) => l.product_id);
    if (parsed.length > 0) {
      setLines(parsed);
      setPrefilled(true);
    }
  }, [searchParams, prefilled]);

  function updateLine(i: number, field: keyof Line, value: string) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // auto-fill unit_price from product cost_price
      if (field === "product_id") {
        const p = products.find((p) => p.id === value);
        if (p?.cost_price) next[i].unit_price = String(p.cost_price);
      }
      return next;
    });
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalAmount = lines.reduce((s, l) => {
    const qty = parseFloat(l.qty_ordered) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return s + qty * price;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id:   supplierId,
        expected_date: expectedDate || null,
        reference_doc: referenceDoc || null,
        notes:         notes || null,
        lines: lines
          .filter((l) => l.product_id)
          .map((l) => ({
            product_id:  l.product_id,
            qty_ordered: parseFloat(l.qty_ordered) || 1,
            unit_price:  parseFloat(l.unit_price)  || 0,
            notes:       l.notes || null,
          })),
      }),
    });

    if (!res.ok) {
      try {
        const d = await res.json();
        setError(d.error?.formErrors?.[0] ?? d.error ?? "เกิดข้อผิดพลาด");
      } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/purchase-orders/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </Link>
        <h2 className="text-lg font-semibold">สร้างใบสั่งซื้อใหม่</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Header */}
        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลใบสั่งซื้อ</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">ผู้จัดหา *</Label>
              <select
                id="supplier"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">-- เลือกผู้จัดหา --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected">วันที่คาดว่าจะรับสินค้า</Label>
              <Input
                id="expected"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">เอกสารอ้างอิง</Label>
              <Input
                id="ref"
                placeholder="Quotation No., Contract No."
                value={referenceDoc}
                onChange={(e) => setReferenceDoc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Input
                id="notes"
                placeholder="หมายเหตุเพิ่มเติม"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">รายการสินค้า</CardTitle>
              <Button
                type="button"
                onClick={() => setLines((p) => [...p, emptyLine()])}
                className="h-7 text-xs bg-muted text-foreground hover:bg-muted/80"
              >
                <Plus className="h-3 w-3 mr-1" /> เพิ่มรายการ
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">สินค้า *</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">จำนวน</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">ราคาต่อหน่วย</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">รวม</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">หมายเหตุ</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const lineTotal = (parseFloat(line.qty_ordered) || 0) * (parseFloat(line.unit_price) || 0);
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                          value={line.product_id}
                          onChange={(e) => updateLine(i, "product_id", e.target.value)}
                          required
                        >
                          <option value="">-- เลือกสินค้า --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="0.01" step="any"
                          className="h-7 text-xs"
                          value={line.qty_ordered}
                          onChange={(e) => updateLine(i, "qty_ordered", e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="0" step="any"
                          className="h-7 text-xs"
                          value={line.unit_price}
                          onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">
                        ฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-7 text-xs"
                          placeholder="หมายเหตุ"
                          value={line.notes}
                          onChange={(e) => updateLine(i, "notes", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold">รวมทั้งหมด</td>
                  <td colSpan={3} className="px-3 py-2 text-sm font-bold text-red-600">
                    ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Link href="/purchase-orders">
            <Button type="button" className="bg-muted hover:bg-muted/80 text-foreground">ยกเลิก</Button>
          </Link>
          <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
            {submitting ? "กำลังสร้าง…" : "สร้างใบสั่งซื้อ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
