import { prisma } from "@/lib/prisma";
import CreateLotSection from "./create-lot-section";
import LotsTable, { type LotRow } from "./lots-table";

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

export default async function LotsPage() {
  const lots = await getLots();

  const rows: LotRow[] = lots.map((lot) => ({
    id:              lot.id,
    lot_number:      lot.lot_number,
    productName:     lot.product.name,
    productSku:      lot.product.sku,
    productUnit:     lot.product.unit,
    totalQty:        lot.stock_items.reduce((s, i) => s + Number(i.qty_on_hand), 0),
    created_at:      lot.created_at.toISOString(),
    manufactured_at: lot.manufactured_at ? lot.manufactured_at.toISOString().slice(0, 10) : null,
    expires_at:      lot.expires_at ? lot.expires_at.toISOString().slice(0, 10) : null,
    status:          lot.status,
  }));

  return (
    <div className="space-y-4">
      <CreateLotSection lotCount={rows.length} />
      <LotsTable lots={rows} />
    </div>
  );
}
