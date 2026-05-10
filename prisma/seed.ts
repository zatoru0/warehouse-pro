import { PrismaClient, WarehouseType, BinStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding…");

  // ── Categories ────────────────────────────────────────────────────────────
  const [electronics, furniture, health, supplies] = await Promise.all([
    prisma.category.upsert({ where: { code: "ELEC" }, update: {}, create: { code: "ELEC", name: "Electronics", name_th: "อิเล็กทรอนิกส์" } }),
    prisma.category.upsert({ where: { code: "FURN" }, update: {}, create: { code: "FURN", name: "Furniture",   name_th: "เฟอร์นิเจอร์" } }),
    prisma.category.upsert({ where: { code: "HLTH" }, update: {}, create: { code: "HLTH", name: "Health",      name_th: "สุขภาพ" } }),
    prisma.category.upsert({ where: { code: "SUPP" }, update: {}, create: { code: "SUPP", name: "Supplies",    name_th: "วัสดุสิ้นเปลือง" } }),
  ]);

  // ── Warehouses (5 ประเภทตาม PDF) ─────────────────────────────────────────
  const warehouses = await Promise.all(
    [
      { code: "WH-STOCK", name: "Main Stock",        name_th: "คลังสต็อกสินค้า",   type: WarehouseType.STOCK },
      { code: "WH-PROD",  name: "Production/Repair", name_th: "คลังผลิต/ซ่อม",     type: WarehouseType.PRODUCTION_REPAIR },
      { code: "WH-QC",    name: "QC Warehouse",      name_th: "คลัง QC",          type: WarehouseType.QC },
      { code: "WH-READY", name: "Ready for Sale",    name_th: "คลังพร้อมจำหน่าย",  type: WarehouseType.READY },
      { code: "WH-SHIP",  name: "Shipping",          name_th: "คลังรอจัดส่ง",      type: WarehouseType.SHIPPING },
    ].map((wh) =>
      prisma.warehouse.upsert({ where: { code: wh.code }, update: {}, create: wh })
    )
  );

  // ── Bins ตาม PDF (Warehouse → Bin โดยตรง, zone_code เป็น string field) ──
  const binsByWarehouse: Record<string, { code: string; zone_code: string }[]> = {
    "WH-STOCK": [
      { code: "RECEIVE",         zone_code: "A" },
      { code: "RAW_PARTS",       zone_code: "A" },
      { code: "NEW_MACHINE",     zone_code: "B" },
      { code: "RETURNED_GOODS",  zone_code: "C" },
    ],
    "WH-PROD": [
      { code: "WAIT_REPAIR",   zone_code: "P" },
      { code: "IN_REPAIR",     zone_code: "P" },
      { code: "ASSEMBLY",      zone_code: "P" },
      { code: "DISASSEMBLY",   zone_code: "P" },
      { code: "CERTIFY_WAIT",  zone_code: "P" },
    ],
    "WH-QC": [
      { code: "WAIT_QC",  zone_code: "Q" },
      { code: "QC_PASS",  zone_code: "Q" },
      { code: "QC_FAIL",  zone_code: "Q" },
    ],
    "WH-READY": [
      { code: "SALE_MACHINE",  zone_code: "R" },
      { code: "SALE_PARTS",    zone_code: "R" },
      { code: "RESERVED",      zone_code: "R" },
      { code: "SPECIAL_ORDER", zone_code: "R" },
    ],
    "WH-SHIP": [
      { code: "WAIT_PACK",      zone_code: "S" },
      { code: "WAIT_DELIVERY",  zone_code: "S" },
      { code: "OUTBOUND_HOLD",  zone_code: "S" },
    ],
  };

  for (const wh of warehouses) {
    const bins = binsByWarehouse[wh.code] ?? [];
    for (const b of bins) {
      await prisma.bin.upsert({
        where: { warehouse_id_code: { warehouse_id: wh.id, code: b.code } },
        update: {},
        create: {
          warehouse_id: wh.id,
          code:         b.code,
          zone_code:    b.zone_code,
          status:       BinStatus.AVAILABLE,
        },
      });
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.product.upsert({
      where:  { sku: "SKU-00412" },
      update: {},
      create: {
        category_id: electronics.id,
        sku: "SKU-00412", name: "Smartphone X12", name_th: "สมาร์ทโฟน X12",
        unit: "PCS", cost_price: 8500, sale_price: 12000,
        min_stock_qty: 50, reorder_qty: 100,
        allow_sale: true, allow_repair: true, allow_claim: true, allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where:  { sku: "SKU-00198" },
      update: {},
      create: {
        category_id: furniture.id,
        sku: "SKU-00198", name: "Office Chair Pro", name_th: "เก้าอี้สำนักงาน Pro",
        unit: "PCS", cost_price: 3200, sale_price: 5500,
        min_stock_qty: 10, reorder_qty: 20,
        allow_sale: true, allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where:  { sku: "SKU-00763" },
      update: {},
      create: {
        category_id: health.id,
        sku: "SKU-00763", name: "Vitamin C 500mg", name_th: "วิตามิน C 500mg",
        unit: "BOX", cost_price: 150, sale_price: 280,
        min_stock_qty: 100, reorder_qty: 200,
        allow_sale: true, allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where:  { sku: "SKU-00089" },
      update: {},
      create: {
        category_id: supplies.id,
        sku: "SKU-00089", name: "Storage Bin L", name_th: "กล่องเก็บของ L",
        unit: "PCS", cost_price: 120, sale_price: 200,
        min_stock_qty: 50, reorder_qty: 100,
        allow_sale: true, allow_qc: false,
      },
    }),
  ]);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
