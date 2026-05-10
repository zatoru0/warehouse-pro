import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

async function getProducts() {
  return prisma.product.findMany({
    where: { is_active: true },
    include: { category: { select: { name: true } } },
    orderBy: { created_at: "desc" },
    take: 100,
  });
}

const FLAG_LABELS: [string, string][] = [
  ["allow_sale",     "ขาย"],
  ["allow_purchase", "ซื้อ"],
  ["allow_repair",   "ซ่อม"],
  ["allow_claim",    "เคลม"],
  ["allow_qc",       "QC"],
];

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">รายการสินค้า</h2>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-red-700"
        >
          <Plus className="h-3.5 w-3.5" />
          เพิ่มสินค้า
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อสินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัสสินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมวดหมู่</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หน่วย</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ต้นทุน</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">คุณสมบัติ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="font-medium hover:text-red-500">
                        {p.name}
                      </Link>
                      {p.name_th && (
                        <p className="text-xs text-muted-foreground">{p.name_th}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {p.cost_price ? `฿${Number(p.cost_price).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {FLAG_LABELS.filter(([key]) => (p as Record<string, unknown>)[key]).map(([, label]) => (
                          <Badge key={label} variant="secondary" className="text-[10px]">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      ยังไม่มีสินค้า คลิก &quot;เพิ่มสินค้า&quot; เพื่อสร้าง
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
