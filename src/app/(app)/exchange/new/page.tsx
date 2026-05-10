"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product  = { id: string; name: string; sku: string };
type Customer = { id: string; name: string; code: string };
type Bin      = { id: string; code: string; zone_code: string | null; warehouse: { name: string } };
type StockItem = { lot_id: string; bin_id: string; qty_on_hand: string; lot: { lot_number: string }; bin: { code: string; warehouse: { name: string } } };

export default function NewExchangePage() {
  const router = useRouter();
  const { data: productsData } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: customersData } = useSWR("/api/customers", fetcher);
  const { data: binsData }      = useSWR("/api/bins", fetcher);

  const products:  Product[]  = productsData?.products ?? [];
  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];
  const bins: Bin[]            = Array.isArray(binsData) ? binsData : [];

  const [newProductId, setNewProductId] = useState("");
  const [newLotId,     setNewLotId]     = useState("");
  const [newBinId,     setNewBinId]     = useState("");
  const [oldProductId, setOldProductId] = useState("");
  const [oldLotId,     setOldLotId]     = useState("");
  const [customerId,   setCustomerId]   = useState("");
  const [notes,        setNotes]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");

  const { data: newStockData } = useSWR<StockItem[]>(
    newProductId ? `/api/stock?productId=${newProductId}` : null, fetcher
  );
  const newStock: StockItem[] = (Array.isArray(newStockData) ? newStockData : []).filter(
    (s) => Number(s.qty_on_hand) > 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductId || !oldProductId) { setError("กรุณาเลือกสินค้าทั้งสองฝั่ง"); return; }
    setError(""); setSubmitting(true);

    const res = await fetch("/api/exchange", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId:   customerId   || null,
        newProductId,
        newLotId:     newLotId    || null,
        newBinId:     newBinId    || null,
        oldProductId,
        oldLotId:     oldLotId    || null,
        notes:        notes       || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    router.push("/exchange");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">สร้างงานแลกเปลี่ยนเครื่อง</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        {/* ลูกค้า */}
        <Card>
          <CardHeader><CardTitle className="text-sm">ลูกค้า</CardTitle></CardHeader>
          <CardContent>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">-- ไม่ระบุลูกค้า --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* เครื่องใหม่ที่จะให้ */}
          <Card className="border-green-500/30">
            <CardHeader><CardTitle className="text-sm text-green-600">เครื่องใหม่ (ออกจากสต็อก)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">สินค้า *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={newProductId} onChange={(e) => { setNewProductId(e.target.value); setNewLotId(""); setNewBinId(""); }} required
                >
                  <option value="">-- เลือก --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              {newStock.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Lot / ตำแหน่ง</Label>
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    value={`${newLotId}|${newBinId}`}
                    onChange={(e) => { const [l,b] = e.target.value.split("|"); setNewLotId(l); setNewBinId(b); }}
                  >
                    <option value="|">-- ไม่ระบุ --</option>
                    {newStock.map((s) => (
                      <option key={`${s.lot_id}|${s.bin_id}`} value={`${s.lot_id}|${s.bin_id}`}>
                        {s.lot.lot_number} — {s.bin.code} ({Number(s.qty_on_hand)} ชิ้น)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center pt-16">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* เครื่องเก่าที่รับคืน */}
          <Card className="border-amber-500/30">
            <CardHeader><CardTitle className="text-sm text-amber-600">เครื่องเก่า (รับคืนจากลูกค้า)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">สินค้า *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={oldProductId} onChange={(e) => setOldProductId(e.target.value)} required
                >
                  <option value="">-- เลือก --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">เลข Lot / S/N (ถ้ามี)</Label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  placeholder="ระบุถ้าทราบ"
                  value={oldLotId}
                  onChange={(e) => setOldLotId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">หมายเหตุ</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              rows={3} placeholder="เหตุผลการแลกเปลี่ยน…"
              value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" onClick={() => router.back()} className="bg-muted hover:bg-muted/80 text-foreground">ยกเลิก</Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting}>
            {submitting ? "กำลังบันทึก…" : "สร้างงานแลกเปลี่ยน"}
          </Button>
        </div>
      </form>
    </div>
  );
}
