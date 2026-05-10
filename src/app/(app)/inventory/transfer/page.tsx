"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = { id: string; name: string; sku: string };
type Bin     = { id: string; code: string; zone_code: string | null; warehouse: { name: string; code: string } };
type StockItem = { lot_id: string; bin_id: string; qty_on_hand: string; lot: { lot_number: string }; bin: { code: string; warehouse: { name: string } } };

export default function StockTransferPage() {
  const router = useRouter();
  const { data: productsData } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: binsData }     = useSWR("/api/bins", fetcher);

  const products: Product[] = productsData?.products ?? [];
  const bins: Bin[] = Array.isArray(binsData) ? binsData : [];

  const [productId, setProductId] = useState("");
  const [lotId,     setLotId]     = useState("");
  const [fromBinId, setFromBinId] = useState("");
  const [toBinId,   setToBinId]   = useState("");
  const [qty,       setQty]       = useState("");
  const [notes,     setNotes]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");

  const { data: stockData } = useSWR<StockItem[]>(
    productId ? `/api/stock?productId=${productId}` : null,
    fetcher
  );
  const stockItems: StockItem[] = Array.isArray(stockData) ? stockData : [];
  const filteredStock = stockItems.filter((s) => Number(s.qty_on_hand) > 0);

  const selectedStock = filteredStock.find((s) => s.lot_id === lotId && s.bin_id === fromBinId);
  const maxQty = selectedStock ? Number(selectedStock.qty_on_hand) : 0;

  const fromBin = bins.find((b) => b.id === fromBinId);
  const toBin   = bins.find((b) => b.id === toBinId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !lotId || !fromBinId || !toBinId || !qty) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (fromBinId === toBinId) { setError("ต้นทางและปลายทางต้องต่างกัน"); return; }
    setError(""); setSuccess(""); setSubmitting(true);

    const res = await fetch("/api/stock/transfer", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ productId, lotId, fromBinId, toBinId, qty: Number(qty), notes: notes || undefined }),
    });

    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }

    setSuccess("โอนย้ายสำเร็จ");
    setProductId(""); setLotId(""); setFromBinId(""); setToBinId(""); setQty(""); setNotes("");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/inventory")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← สินค้าคงคลัง
        </button>
        <h2 className="text-lg font-semibold">โอนย้ายสินค้า (Transfer)</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error   && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600">{success}</div>}

        <Card>
          <CardHeader><CardTitle className="text-sm">เลือกสินค้า</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>สินค้า *</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setLotId(""); setFromBinId(""); }}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            {filteredStock.length > 0 && (
              <div className="space-y-2">
                <Label>Lot / ต้นทาง *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={`${lotId}|${fromBinId}`}
                  onChange={(e) => {
                    const [l, b] = e.target.value.split("|");
                    setLotId(l); setFromBinId(b); setQty("");
                  }}
                  required
                >
                  <option value="|">-- เลือก Lot / ตำแหน่ง --</option>
                  {filteredStock.map((s) => (
                    <option key={`${s.lot_id}|${s.bin_id}`} value={`${s.lot_id}|${s.bin_id}`}>
                      {s.lot.lot_number} — {s.bin.code} ({s.bin.warehouse.name}) — {Number(s.qty_on_hand)} ชิ้น
                    </option>
                  ))}
                </select>
              </div>
            )}

            {productId && filteredStock.length === 0 && (
              <p className="text-xs text-muted-foreground">ไม่มี stock ของสินค้านี้</p>
            )}
          </CardContent>
        </Card>

        {fromBinId && (
          <Card>
            <CardHeader><CardTitle className="text-sm">ปลายทาง</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1 rounded-lg bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">จาก</p>
                  <p className="font-medium">{fromBin?.code}</p>
                  <p className="text-xs text-muted-foreground">{fromBin?.warehouse.name}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    value={toBinId}
                    onChange={(e) => setToBinId(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกปลายทาง --</option>
                    {bins.filter((b) => b.id !== fromBinId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}{b.zone_code ? ` (${b.zone_code})` : ""} — {b.warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>จำนวน * (สูงสุด {maxQty})</Label>
                  <Input
                    type="number" min="1" max={maxQty} step="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ไม่บังคับ" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" onClick={() => router.push("/inventory")} className="bg-muted hover:bg-muted/80 text-foreground">
            กลับ
          </Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting || !fromBinId || !toBinId}>
            {submitting ? "กำลังโอนย้าย…" : "ยืนยันโอนย้าย"}
          </Button>
        </div>
      </form>
    </div>
  );
}
