"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = { id: string; name: string; sku: string; allow_disassembly: boolean };
type Bin     = { id: string; code: string; zone_code: string | null; warehouse: { name: string; code: string } };
type StockItem = { lot_id: string; bin_id: string; qty_on_hand: string; lot: { lot_number: string }; bin: { code: string; warehouse: { name: string } } };

interface PartRow { productId: string; qty: string; toBinId: string }

export default function DisassemblyPage() {
  const router = useRouter();
  const { data: productsData }   = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: binsData }       = useSWR("/api/bins", fetcher);

  const allProducts = productsData?.products ?? [];
  const disProducts = allProducts.filter((p) => p.allow_disassembly);
  const bins: Bin[] = Array.isArray(binsData) ? binsData : [];

  const [productId,  setProductId]  = useState("");
  const [lotId,      setLotId]      = useState("");
  const [fromBinId,  setFromBinId]  = useState("");
  const [qty,        setQty]        = useState("1");
  const [notes,      setNotes]      = useState("");
  const [parts,      setParts]      = useState<PartRow[]>([{ productId: "", qty: "1", toBinId: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const { data: stockData } = useSWR<StockItem[]>(
    productId ? `/api/stock?productId=${productId}` : null,
    fetcher
  );
  const stockItems: StockItem[] = Array.isArray(stockData) ? stockData : [];

  function addPart() { setParts((p) => [...p, { productId: "", qty: "1", toBinId: "" }]); }
  function removePart(i: number) { setParts((p) => p.filter((_, idx) => idx !== i)); }
  function updatePart(i: number, key: keyof PartRow, val: string) {
    setParts((p) => p.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !lotId || !fromBinId) { setError("กรุณากรอกข้อมูลให้ครบ"); return; }
    if (parts.some((p) => !p.productId || !p.qty)) { setError("กรุณากรอกชิ้นส่วนให้ครบ"); return; }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/disassembly", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        productId,
        lotId,
        fromBinId,
        qty:   Number(qty),
        notes: notes || null,
        parts: parts.map((p) => ({
          productId: p.productId,
          qty:       Number(p.qty),
          toBinId:   p.toBinId || null,
        })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }
    router.push("/inventory");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">แยกชิ้นส่วน (Disassembly)</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* สินค้าที่จะแตก */}
        <Card>
          <CardHeader><CardTitle className="text-sm">สินค้าที่จะแยกชิ้นส่วน</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>สินค้า (allow_disassembly = true) *</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setLotId(""); setFromBinId(""); }}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {disProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            {stockItems.length > 0 && (
              <div className="space-y-2">
                <Label>เลือก Lot / ตำแหน่ง *</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={`${lotId}|${fromBinId}`}
                  onChange={(e) => {
                    const [l, b] = e.target.value.split("|");
                    setLotId(l); setFromBinId(b);
                  }}
                  required
                >
                  <option value="|">-- เลือก Lot และตำแหน่ง --</option>
                  {stockItems.filter((s) => Number(s.qty_on_hand) > 0).map((s) => (
                    <option key={`${s.lot_id}|${s.bin_id}`} value={`${s.lot_id}|${s.bin_id}`}>
                      {s.lot.lot_number} — {s.bin.code} ({s.bin.warehouse.name}) — {Number(s.qty_on_hand)} ชิ้น
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวนที่จะแยก *</Label>
                <Input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ไม่บังคับ" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ชิ้นส่วนที่ได้ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">ชิ้นส่วนที่ได้จากการแยก</CardTitle>
              <button type="button" onClick={addPart} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                <Plus className="h-3 w-3" /> เพิ่มชิ้นส่วน
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {parts.map((part, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-end">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs">สินค้า/ชิ้นส่วน</Label>}
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    value={part.productId}
                    onChange={(e) => updatePart(i, "productId", e.target.value)}
                    required
                  >
                    <option value="">-- เลือก --</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs">จำนวน</Label>}
                  <Input
                    type="number" min="1" step="1"
                    value={part.qty}
                    onChange={(e) => updatePart(i, "qty", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs">เก็บที่ (Bin)</Label>}
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    value={part.toBinId}
                    onChange={(e) => updatePart(i, "toBinId", e.target.value)}
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {bins.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}{b.zone_code ? ` (${b.zone_code})` : ""} — {b.warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => removePart(i)} disabled={parts.length === 1}
                  className="self-end p-2 text-muted-foreground hover:text-destructive disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" onClick={() => router.back()} className="bg-muted hover:bg-muted/80 text-foreground">
            ยกเลิก
          </Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting}>
            {submitting ? "กำลังดำเนินการ…" : "ยืนยันแยกชิ้นส่วน"}
          </Button>
        </div>
      </form>
    </div>
  );
}
