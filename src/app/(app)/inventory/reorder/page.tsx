import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import ReorderTable from "./ReorderTable";

async function getReorderProducts() {
  const products = await prisma.product.findMany({
    where: {
      is_active: true,
      min_stock_qty: { gt: 0 },
    },
    include: {
      stock_items: { select: { qty_on_hand: true, qty_reserved: true } },
      category:    { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return products
    .map((p) => {
      const onHand = p.stock_items.reduce((s, si) => s + Number(si.qty_on_hand), 0);
      const reserved = p.stock_items.reduce((s, si) => s + Number(si.qty_reserved), 0);
      const available = onHand - reserved;
      const needed = Math.max((p.reorder_qty || p.min_stock_qty) - onHand, 0);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        category: p.category?.name ?? null,
        cost_price: p.cost_price ? Number(p.cost_price) : null,
        min_stock_qty: p.min_stock_qty,
        reorder_qty:   p.reorder_qty,
        on_hand: onHand,
        available,
        needed,
        below: onHand <= p.min_stock_qty,
      };
    })
    .filter((p) => p.below)
    .sort((a, b) => a.on_hand / Math.max(a.min_stock_qty, 1) - b.on_hand / Math.max(b.min_stock_qty, 1));
}

export default async function ReorderPage() {
  const items = await getReorderProducts();
  const critical = items.filter((p) => p.on_hand === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">รายการสินค้าใกล้หมด (Reorder)</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} รายการต่ำกว่า min stock — หมดสต็อก {critical} รายการ
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500 opacity-60" />
            <p>ทุกรายการสต็อกเพียงพอ</p>
            <p className="text-xs mt-1">ไม่มีสินค้าที่ต่ำกว่า min stock</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {critical > 0 && (
            <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>มีสินค้า <strong>{critical}</strong> รายการที่หมดสต็อกแล้ว — ควรสั่งซื้อทันที</p>
            </div>
          )}

          <ReorderTable items={items} />
        </>
      )}
    </div>
  );
}
