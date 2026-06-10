"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

type Item = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category: string | null;
  cost_price: number | null;
  min_stock_qty: number;
  reorder_qty: number;
  on_hand: number;
  available: number;
  needed: number;
  below: boolean;
};

export default function ReorderTable({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );

  const estimatedTotal = selectedItems.reduce(
    (s, i) => s + (i.cost_price ?? 0) * i.needed,
    0,
  );

  function createPO() {
    if (selectedItems.length === 0) return;
    const params = new URLSearchParams();
    params.set(
      "lines",
      selectedItems
        .map((i) => `${i.id}:${i.needed}:${i.cost_price ?? 0}`)
        .join(","),
    );
    router.push(`/purchase-orders/new?${params.toString()}`);
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-14 z-10 flex items-center justify-between rounded-lg border border-red-600/30 bg-card px-4 py-2.5 shadow-sm">
          <div className="text-sm">
            <span className="font-semibold">เลือกแล้ว {selected.size} รายการ</span>
            {estimatedTotal > 0 && (
              <span className="ml-3 text-muted-foreground">
                ประมาณ ฿{estimatedTotal.toLocaleString()}
              </span>
            )}
          </div>
          <Button
            onClick={createPO}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            สร้าง PO จากรายการที่เลือก
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมวด</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">คงเหลือ</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Min</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">ควรสั่ง</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">ต้นทุน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const isOut = p.on_hand === 0;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 ${
                      isOut ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isOut ? "text-red-600" : "text-amber-600"}`}>
                      {p.on_hand.toLocaleString()} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.min_stock_qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.needed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {p.cost_price ? `฿${p.cost_price.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
