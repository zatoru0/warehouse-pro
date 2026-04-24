import { PrismaClient, WarehouseType, BinStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // ── Categories ────────────────────────────────────────────────────────────
  const [electronics, furniture, health, supplies] = await Promise.all([
    prisma.category.upsert({ where: { code: "ELEC" }, update: {}, create: { code: "ELEC", name: "Electronics", name_th: "อิเล็กทรอนิกส์" } }),
    prisma.category.upsert({ where: { code: "FURN" }, update: {}, create: { code: "FURN", name: "Furniture", name_th: "เฟอร์นิเจอร์" } }),
    prisma.category.upsert({ where: { code: "HLTH" }, update: {}, create: { code: "HLTH", name: "Health", name_th: "สุขภาพ" } }),
    prisma.category.upsert({ where: { code: "SUPP" }, update: {}, create: { code: "SUPP", name: "Supplies", name_th: "วัสดุสิ้นเปลือง" } }),
  ]);

  // ── Warehouses (5 types) ──────────────────────────────────────────────────
  const warehouses = await Promise.all(
    [
      { code: "WH-STOCK",  name: "Main Stock",       name_th: "คลังสต็อกสินค้า",       type: WarehouseType.STOCK },
      { code: "WH-PROD",   name: "Production/Repair",name_th: "คลังผลิต/ซ่อมบำรุง",     type: WarehouseType.PRODUCTION_REPAIR },
      { code: "WH-QC",     name: "QC Warehouse",     name_th: "คลัง QC",               type: WarehouseType.QC },
      { code: "WH-READY",  name: "Ready for Sale",   name_th: "คลังพร้อมจำหน่าย",      type: WarehouseType.READY },
      { code: "WH-SHIP",   name: "Shipping",          name_th: "คลังรอจัดส่ง",          type: WarehouseType.SHIPPING },
    ].map((wh) =>
      prisma.warehouse.upsert({
        where: { code: wh.code },
        update: {},
        create: wh,
      })
    )
  );

  // ── Zones & Bins for Main Stock ───────────────────────────────────────────
  const stockWh = warehouses[0];
  const zoneData = [
    { code: "A", name: "Zone A - Receiving" },
    { code: "B", name: "Zone B - Electronics" },
    { code: "C", name: "Zone C - General" },
  ];

  for (const zd of zoneData) {
    const zone = await prisma.zone.upsert({
      where: { warehouse_id_code: { warehouse_id: stockWh.id, code: zd.code } },
      update: {},
      create: { warehouse_id: stockWh.id, code: zd.code, name: zd.name, capacity: 100 },
    });
    for (let row = 1; row <= 3; row++) {
      for (let col = 1; col <= 3; col++) {
        const binCode = `${zd.code}${row}-${String(col).padStart(2, "0")}`;
        await prisma.bin.upsert({
          where: { zone_id_code: { zone_id: zone.id, code: binCode } },
          update: {},
          create: {
            zone_id: zone.id,
            code: binCode,
            name: binCode,
            status: BinStatus.AVAILABLE,
          },
        });
      }
    }
  }

  // ── Zones for QC warehouse ────────────────────────────────────────────────
  const qcWh = warehouses[2];
  const qcZone = await prisma.zone.upsert({
    where: { warehouse_id_code: { warehouse_id: qcWh.id, code: "QC" } },
    update: {},
    create: { warehouse_id: qcWh.id, code: "QC", name: "QC Zone" },
  });
  await prisma.bin.upsert({
    where: { zone_id_code: { zone_id: qcZone.id, code: "QC-HOLD" } },
    update: {},
    create: { zone_id: qcZone.id, code: "QC-HOLD", name: "QC Holding", status: BinStatus.AVAILABLE },
  });

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "SKU-00412" },
      update: {},
      create: {
        category_id: electronics.id,
        sku: "SKU-00412",
        name: "Smartphone X12",
        name_th: "สมาร์ทโฟน X12",
        unit: "PCS",
        cost_price: 8500,
        sale_price: 12000,
        min_stock_qty: 50,
        reorder_qty: 100,
        allow_sale: true,
        allow_repair: true,
        allow_claim: true,
        allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SKU-00198" },
      update: {},
      create: {
        category_id: furniture.id,
        sku: "SKU-00198",
        name: "Office Chair Pro",
        name_th: "เก้าอี้สำนักงาน Pro",
        unit: "PCS",
        cost_price: 3200,
        sale_price: 5500,
        min_stock_qty: 10,
        reorder_qty: 20,
        allow_sale: true,
        allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SKU-00763" },
      update: {},
      create: {
        category_id: health.id,
        sku: "SKU-00763",
        name: "Vitamin C 500mg",
        name_th: "วิตามิน C 500mg",
        unit: "BOX",
        cost_price: 150,
        sale_price: 280,
        min_stock_qty: 100,
        reorder_qty: 200,
        allow_sale: true,
        allow_qc: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SKU-00089" },
      update: {},
      create: {
        category_id: supplies.id,
        sku: "SKU-00089",
        name: "Storage Bin L",
        name_th: "กล่องเก็บของ L",
        unit: "PCS",
        cost_price: 120,
        sale_price: 200,
        min_stock_qty: 50,
        reorder_qty: 100,
        allow_sale: true,
        allow_qc: false,
      },
    }),
  ]);

  // ── Carriers ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.carrier.upsert({ where: { code: "KERRY" }, update: {}, create: { code: "KERRY", name: "Kerry Express", name_th: "เคอรี่" } }),
    prisma.carrier.upsert({ where: { code: "FLASH" }, update: {}, create: { code: "FLASH", name: "Flash Express", name_th: "แฟลช" } }),
    prisma.carrier.upsert({ where: { code: "SPX" }, update: {}, create: { code: "SPX", name: "Shopee Express", name_th: "ช้อปปี้เอ็กซ์เพรส" } }),
    prisma.carrier.upsert({ where: { code: "LAZEX" }, update: {}, create: { code: "LAZEX", name: "Lazada Express" } }),
  ]);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
