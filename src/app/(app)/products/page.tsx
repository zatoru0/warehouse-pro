import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ["allow_sale", "Sale"],
  ["allow_repair", "Repair"],
  ["allow_qc", "QC"],
  ["allow_assembly", "Assembly"],
  ["allow_claim", "Claim"],
];

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Product Catalogue</h2>
        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/products/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Behaviours</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="font-medium hover:text-amber-400">
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
                        {FLAG_LABELS.filter(([key]) => (p as any)[key]).map(([, label]) => (
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
                      No products yet. Click &quot;Add Product&quot; to create one.
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
