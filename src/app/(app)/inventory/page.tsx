import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getStockItems() {
  return prisma.stockItem.findMany({
    include: {
      product: { select: { name: true, sku: true, unit: true, min_stock_qty: true } },
      lot: { select: { lot_number: true, status: true } },
      bin: {
        include: {
          zone: { include: { warehouse: { select: { name: true, type: true } } } },
        },
      },
    },
    orderBy: { updated_at: "desc" },
    take: 100,
  });
}

export default async function InventoryPage() {
  const items = await getStockItems();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventory Stock</h2>
        <span className="text-sm text-muted-foreground">{items.length} locations</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lot</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">On Hand</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reserved</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const available = Number(item.qty_on_hand) - Number(item.qty_reserved);
                  const isLow = Number(item.qty_on_hand) <= item.product.min_stock_qty;
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{item.product.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.product.sku}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.lot.lot_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.bin.zone.warehouse.name} › {item.bin.zone.code} › {item.bin.code}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(item.qty_on_hand).toLocaleString()} {item.product.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {Number(item.qty_reserved).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : available > 0 ? (
                          <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20">
                            In Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Out of Stock</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No stock items found. Start by receiving goods.
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
