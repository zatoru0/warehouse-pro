import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Printer, QrCode } from "lucide-react";

async function getLots() {
  return prisma.lot.findMany({
    include: {
      product: { select: { name: true, sku: true, unit: true } },
      stock_items: {
        select: { qty_on_hand: true },
      },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:     "ใช้งาน",
  QUARANTINE: "กักกัน",
  CONSUMED:   "ใช้หมดแล้ว",
  EXPIRED:    "หมดอายุ",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     "bg-green-500/10 text-green-600",
  QUARANTINE: "bg-amber-500/10 text-amber-600",
  CONSUMED:   "bg-muted text-muted-foreground",
  EXPIRED:    "bg-red-500/10 text-red-600",
};

export default async function LotsPage() {
  const lots = await getLots();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ล็อตสินค้า (Lots)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">บาร์โค้ดแต่ละ Lot สำหรับติดสินค้าและสแกนในคลัง</p>
        </div>
        <span className="text-sm text-muted-foreground">{lots.length} ล็อต</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมายเลข Lot</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">คงเหลือ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมดอายุ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">บาร์โค้ด</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const totalQty = lot.stock_items.reduce(
                    (s, i) => s + Number(i.qty_on_hand),
                    0
                  );
                  return (
                    <tr
                      key={lot.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-red-600">
                          {lot.lot_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{lot.product.name}</p>
                        <p className="text-xs text-muted-foreground">{lot.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totalQty > 0 ? (
                          <span className="font-medium">
                            {totalQty.toLocaleString()} {lot.product.unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(lot.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {lot.expires_at
                          ? format(new Date(lot.expires_at), "dd MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[lot.status] ?? ""}`}
                        >
                          {STATUS_LABELS[lot.status] ?? lot.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/lots/${lot.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-600/20"
                        >
                          <Printer className="h-3 w-3" />
                          พิมพ์
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <QrCode className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">ยังไม่มี Lot — สร้าง Lot ได้จากหน้ารับสินค้า</p>
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
