"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StockItem = {
  id: string;
  product_id: string;
  lot_id: string;
  bin_id: string;
  qty_on_hand: number;
  qty_reserved: number;
  product: { name: string; sku: string; unit: string; min_stock_qty: number };
  lot: { lot_number: string; status: string };
  bin: { code: string; zone_code: string | null; warehouse: { name: string; type: string } };
};

function AdjustModal({
  item,
  onClose,
  onDone,
}: {
  item: StockItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const q = Number(qty);
    if (!q || q <= 0) { setError("กรุณากรอกจำนวนที่ถูกต้อง"); return; }

    setSaving(true);
    const res = await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.product_id,
        lotId:     item.lot_id,
        binId:     item.bin_id,
        qty:       q,
        direction,
        notes:     notes || undefined,
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
      setSaving(false);
      return;
    }

    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">ปรับ Stock</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="font-medium text-sm">{item.product.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.product.sku} • Lot {item.lot.lot_number} • {item.bin.warehouse.name} / {item.bin.code}
          </p>
          <p className="text-xs mt-1">
            คงเหลือปัจจุบัน:{" "}
            <span className="font-semibold text-foreground">
              {Number(item.qty_on_hand).toLocaleString()} {item.product.unit}
            </span>
          </p>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>ทิศทาง</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("IN")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  direction === "IN"
                    ? "border-green-600/50 bg-green-600/10 text-green-600"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                ＋ เพิ่ม (Adjust In)
              </button>
              <button
                type="button"
                onClick={() => setDirection("OUT")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  direction === "OUT"
                    ? "border-red-600/50 bg-red-600/10 text-red-600"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                － ลด (Adjust Out)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-qty">จำนวน ({item.product.unit})</Label>
            <Input
              id="adj-qty"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-notes">หมายเหตุ</Label>
            <textarea
              id="adj-notes"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              placeholder="เหตุผลการปรับ stock…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" onClick={onClose} className="bg-muted hover:bg-muted/80 text-foreground">
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={`font-semibold text-white ${
                direction === "IN"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? "กำลังบันทึก…" : direction === "IN" ? "เพิ่ม Stock" : "ลด Stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { data: items, mutate } = useSWR<StockItem[]>("/api/stock", fetcher);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.product.name.toLowerCase().includes(q) ||
      item.product.sku.toLowerCase().includes(q) ||
      item.lot.lot_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {adjustItem && (
        <AdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onDone={() => { setAdjustItem(null); mutate(); }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold shrink-0">สต็อกสินค้า</h2>
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="ค้นหาสินค้า, SKU, หรือ Lot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Link
          href="/inventory/transfer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          โอนย้าย
        </Link>
        <span className="text-sm text-muted-foreground shrink-0">{filtered.length} ที่เก็บ</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัสสินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ล็อต</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ตำแหน่ง</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">คงเหลือ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">จอง</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered
                  .filter((item) => Number(item.qty_on_hand) >= 0) // <--- จุดที่ 1
                  .map((item) =>{
                  const available = Number(item.qty_on_hand) - Number(item.qty_reserved);
                  const isLow = Number(item.qty_on_hand) <= item.product.min_stock_qty && item.product.min_stock_qty > 0;
                  const zone = item.bin.zone_code ? `${item.bin.zone_code} / ` : "";
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{item.product.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.product.sku}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.lot.lot_number}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.bin.warehouse.name} › {zone}{item.bin.code}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(item.qty_on_hand).toLocaleString()} {item.product.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {Number(item.qty_reserved).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <Badge variant="destructive">ใกล้หมด</Badge>
                        ) : available > 0 ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">มีสินค้า</Badge>
                        ) : (
                          <Badge variant="secondary">หมด</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="ปรับ Stock"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.filter((item) => Number(item.qty_on_hand) >= 0).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {search ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้าในคลัง เริ่มต้นด้วยการรับสินค้า"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
