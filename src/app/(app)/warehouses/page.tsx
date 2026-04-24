import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WAREHOUSE_COLORS: Record<string, string> = {
  STOCK: "bg-blue-500/10 text-blue-400",
  PRODUCTION_REPAIR: "bg-amber-500/10 text-amber-400",
  QC: "bg-purple-500/10 text-purple-400",
  READY: "bg-green-500/10 text-green-400",
  SHIPPING: "bg-cyan-500/10 text-cyan-400",
};

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    where: { is_active: true },
    include: {
      zones: {
        include: { _count: { select: { bins: true } } },
      },
    },
    orderBy: { type: "asc" },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Warehouses</h2>
      <div className="grid grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <Link key={wh.id} href={`/warehouses/${wh.id}`}>
            <Card className="cursor-pointer hover:border-amber-500/50 transition-colors">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{wh.name}</p>
                    <p className="text-xs text-muted-foreground">{wh.code}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${WAREHOUSE_COLORS[wh.type] ?? ""}`}>
                    {wh.type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-xl font-bold">{wh.zones.length}</p>
                    <p className="text-xs text-muted-foreground">Zones</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {wh.zones.reduce((s, z) => s + z._count.bins, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Bins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {warehouses.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-12">
            No warehouses configured. Run the seed to create the default 5 warehouse types.
          </p>
        )}
      </div>
    </div>
  );
}
