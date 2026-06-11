"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, ArrowDown, History } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = { id: string; sku: string; name: string; unit: string };

type StockItem = {
  id: string;
  product_id: string;
  lot_id: string;
  bin_id: string;
  qty_on_hand: number;
  lot: { lot_number: string };
  bin: { code: string; warehouse: { name: string; code: string } };
};

type Movement = {
  id: string;
  movement_type: string;
  qty: string;
  notes: string | null;
  performed_at: string;
  product: { name: string; sku: string };
  lot: { lot_number: string };
  user: { full_name: string };
};

export default function StockAdjustPage() {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [productId, setProductId] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: productsRes } = useSWR<{ products: Product[] }>("/api/products?limit=300", fetcher);
  const products = productsRes?.products ?? [];

  const { data: stockData, mutate: refetchStock } = useSWR<StockItem[]>(
    productId ? `/api/stock?productId=${productId}` : null,
    fetcher,
  );
  const stockItems = Array.isArray(stockData) ? stockData : [];

  const { data: movements, mutate: refetchMovements } = useSWR<Movement[]>(
    "/api/stock/movements?type=ADJUST_IN",
    fetcher,
  );
  const { data: movementsOut, mutate: refetchOut } = useSWR<Movement[]>(
    "/api/stock/movements?type=ADJUST_OUT",
    fetcher,
  );
  const recentAdjustments = useMemo(() => {
    const a = Array.isArray(movements) ? movements : [];
    const b = Array.isArray(movementsOut) ? movementsOut : [];
    return [...a, ...b]
      .sort((x, y) => new Date(y.performed_at).getTime() - new Date(x.performed_at).getTime())
      .slice(0, 30);
  }, [movements, movementsOut]);

  // reset stock item when product changes
  useEffect(() => { setStockItemId(""); }, [productId]);

  const selectedStock = stockItems.find((s) => s.id === stockItemId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = Number(qty);
    if (!q || q <= 0) { setError("กรอกจำนวนที่ถูกต้อง"); return; }
    if (!selectedStock) { setError("เลือก lot/bin ที่จะปรับ"); return; }
    if (!notes.trim()) { setError("ระบุเหตุผลการปรับสต็อก (จำเป็น)"); return; }

    setSaving(true);
    const res = await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedStock.product_id,
        lotId:     selectedStock.lot_id,
        binId:     selectedStock.bin_id,
        qty:       q,
        direction,
        notes,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }

    toast.success(`ปรับสต็อก ${direction === "IN" ? "เพิ่ม" : "ลด"} ${q} เรียบร้อย`);
    setQty(""); setNotes("");
    refetchStock(); refetchMovements(); refetchOut();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ปรับสต็อก (Stock Adjustment)</h2>
        <p className="text-xs text-muted-foreground">
          เพิ่ม/ลดยอดคงเหลือนอกระบบรับเข้า-เบิกออก — ใช้เมื่อนับสต็อกแล้วต่างจากระบบ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Form */}
        <Card>
          <CardHeader><CardTitle className="text-sm">รายการปรับ</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {/* Direction */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("IN")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    direction === "IN"
                      ? "border-green-500 bg-green-500/10 text-green-700"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowUp className="h-4 w-4" /> เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("OUT")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    direction === "OUT"
                      ? "border-red-500 bg-red-500/10 text-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowDown className="h-4 w-4" /> ลด
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">สินค้า *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={productId} onChange={(e) => setProductId(e.target.value)}
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Lot / Bin *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={stockItemId} onChange={(e) => setStockItemId(e.target.value)}
                  disabled={!productId}
                >
                  <option value="">{productId ? "-- เลือก lot/bin --" : "เลือกสินค้าก่อน"}</option>
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lot.lot_number} · {s.bin.warehouse.name}/{s.bin.code} (คงเหลือ {Number(s.qty_on_hand)})
                    </option>
                  ))}
                </select>
                {selectedStock && (
                  <p className="text-[11px] text-muted-foreground">
                    คงเหลือปัจจุบัน: <span className="font-semibold">{Number(selectedStock.qty_on_hand).toLocaleString()}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">จำนวน *</Label>
                <Input
                  type="number" min="0" step="any"
                  value={qty} onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">เหตุผล *</Label>
                <Textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น นับสต็อกพบเพิ่ม / ของแตกเสียหาย"
                  rows={3}
                />
              </div>

              <Button
                type="submit" disabled={saving || !selectedStock}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการปรับสต็อก"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent adjustments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="h-4 w-4" />
            ประวัติการปรับล่าสุด
          </div>
          <Card>
            <CardContent className="p-0">
              {recentAdjustments.length === 0 ? (
                <p className="px-4 py-12 text-center text-xs text-muted-foreground">ยังไม่มีประวัติการปรับ</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เวลา</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า / Lot</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ทิศทาง</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวน</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">โดย / เหตุผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAdjustments.map((m) => {
                      const isIn = m.movement_type === "ADJUST_IN";
                      return (
                        <tr key={m.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(m.performed_at), "dd MMM HH:mm")}
                          </td>
                          <td className="px-4 py-2">
                            <p className="text-xs font-medium">{m.product.name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{m.lot.lot_number}</p>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isIn ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            }`}>
                              {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {isIn ? "เพิ่ม" : "ลด"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">{Number(m.qty).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <p className="text-xs">{m.user.full_name}</p>
                            {m.notes && <p className="text-[11px] text-muted-foreground">{m.notes}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
