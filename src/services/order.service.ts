/**
 * Order workflow — สร้าง → Confirm → Pick → Pack → Ship
 *
 * Lifecycle:
 *   PENDING → CONFIRMED → PICKING → PACKING → SHIPPED → DELIVERED
 *
 * จุดสำคัญ:
 * - PICK เป็นจุดที่ stock ถูกหักออกจริง (writeMovement ISSUE)
 * - SHIP สร้าง Shipment record + เปลี่ยน status
 */
import { prisma } from "@/lib/prisma";
import { OrderChannel } from "@prisma/client";
import { writeMovement } from "./stock.service";
import { nextOrderNumber, nextShipmentNumber } from "./numbering.service";
import { createNotification } from "./notification.service";
import { createJob as createProductionJob } from "./production.service";

export interface CreateOrderInput {
  channel:      OrderChannel;
  customerId?:  string | null;
  notes?:       string | null;
  totalAmount?: number | null;
  handledBy:    string;
}

export interface AddLineInput {
  orderId:    string;
  productId:  string;
  qty:        number;
  unitPrice:  number;
  notes?:     string | null;
}

export interface PickInput {
  orderId:     string;
  performedBy: string;
  picks: Array<{
    lineId: string;
    binId:  string;
    lotId:  string;
    qty:    number;
  }>;
}

export interface ShipInput {
  orderId:        string;
  carrierName?:   string | null;
  trackingNumber?: string | null;
}

export async function createOrder(input: CreateOrderInput) {
  const order_number = await nextOrderNumber();
  const order = await prisma.order.create({
    data: {
      order_number,
      channel:      input.channel,
      customer_id:  input.customerId,
      notes:        input.notes,
      total_amount: input.totalAmount,
      handled_by:   input.handledBy,
    },
  });
  await createNotification({
    type:  "ORDER_PENDING",
    title: `คำสั่งซื้อใหม่: ${order_number}`,
    body:  `ช่องทาง ${input.channel} — รอยืนยัน`,
    link:  `/orders/${order.id}`,
  });
  return order;
}

export async function addLine(input: AddLineInput) {
  return prisma.orderLine.create({
    data: {
      order_id:   input.orderId,
      product_id: input.productId,
      qty:        input.qty,
      unit_price: input.unitPrice,
      notes:      input.notes,
    },
  });
}

export async function removeLine(lineId: string) {
  return prisma.orderLine.delete({ where: { id: lineId } });
}

export async function confirmOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { lines: true },
  });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");
  if (order.status !== "PENDING") throw new Error("คำสั่งซื้อยืนยันแล้ว");
  if (order.lines.length === 0) throw new Error("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ");

  return prisma.order.update({
    where: { id: orderId },
    data:  { status: "CONFIRMED" },
  });
}

/**
 * เบิกสินค้า → หัก stock จริง (ISSUE movement) ทุก line
 * - ทุก line ต้องระบุ bin + lot + qty
 * - ใช้ transaction เดี่ยวต่อ line (writeMovement มี $transaction ในตัว)
 */
export async function pickOrder(input: PickInput) {
  const order = await prisma.order.findUnique({
    where:   { id: input.orderId },
    include: { lines: true },
  });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");
  if (order.status !== "CONFIRMED") throw new Error("ต้องยืนยันคำสั่งซื้อก่อน");

  for (const pick of input.picks) {
    const line = order.lines.find((l) => l.id === pick.lineId);
    if (!line) throw new Error(`ไม่พบรายการ ${pick.lineId}`);

    await writeMovement({
      productId:     line.product_id,
      lotId:         pick.lotId,
      fromBinId:     pick.binId,
      type:          "ISSUE",
      qty:           pick.qty,
      performedBy:   input.performedBy,
      referenceType: "order",
      referenceId:   input.orderId,
    });
  }

  return prisma.order.update({
    where: { id: input.orderId },
    data:  { status: "PICKING" },
  });
}

export interface OrderLineAvailability {
  lineId:      string;
  productId:   string;
  productName: string;
  sku:         string;
  unit:        string;
  qtyOrdered:  number;
  available:   number;
  shortfall:   number;
}

/**
 * เช็คว่าสินค้าใน order "พร้อมขาย" พอไหม — นับ stock เฉพาะคลังพร้อมขาย (type READY)
 * ตามผัง Admin: รับ order → "สินค้าพร้อมขาย?" → ใช่=เบิก / ไม่=สั่งผลิต
 */
export async function getOrderAvailability(orderId: string): Promise<OrderLineAvailability[]> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { lines: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
  });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");

  const result: OrderLineAvailability[] = [];
  for (const line of order.lines) {
    const agg = await prisma.stockItem.aggregate({
      _sum:  { qty_on_hand: true },
      where: { product_id: line.product_id, bin: { warehouse: { type: "READY" } } },
    });
    const available  = Number(agg._sum.qty_on_hand ?? 0);
    const qtyOrdered = Number(line.qty);
    result.push({
      lineId:      line.id,
      productId:   line.product_id,
      productName: line.product.name,
      sku:         line.product.sku,
      unit:        line.product.unit,
      qtyOrdered,
      available,
      shortfall:   Math.max(0, qtyOrdered - available),
    });
  }
  return result;
}

export interface ProduceForOrderInput {
  orderId:     string;
  performedBy: string;
  items:       Array<{ productId: string; qty: number }>;
}

/**
 * สร้างงานผลิตสำหรับสินค้าที่ stock พร้อมขายไม่พอ
 * ตามผัง: "สินค้าพร้อมขาย? → ไม่ → ทำรายการสั่งผลิต"
 */
export async function createProductionForOrder(input: ProduceForOrderInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");

  const prodWarehouse = await prisma.warehouse.findFirst({
    where: { type: "PRODUCTION_REPAIR", is_active: true },
  });
  if (!prodWarehouse) throw new Error("ไม่พบคลังฝ่ายผลิต (PRODUCTION_REPAIR)");

  const jobs = [];
  for (const item of input.items) {
    if (item.qty <= 0) continue;
    const job = await createProductionJob({
      jobType:     "ASSEMBLY",
      productId:   item.productId,
      qtyPlanned:  item.qty,
      warehouseId: prodWarehouse.id,
      priority:    "URGENT",
      notes:       `สั่งผลิตจากคำสั่งซื้อ ${order.order_number}`,
    });
    jobs.push(job);
  }
  if (jobs.length === 0) throw new Error("ไม่มีรายการที่ต้องผลิต");
  return jobs;
}

export async function packOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");
  if (order.status !== "PICKING") throw new Error("ต้องเบิกสินค้าก่อน");

  return prisma.order.update({
    where: { id: orderId },
    data:  { status: "PACKING" },
  });
}

export async function shipOrder(input: ShipInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อ");
  if (order.status !== "PACKING") throw new Error("ต้องแพ็กสินค้าก่อน");

  const shipment_number = await nextShipmentNumber();
  await prisma.shipment.create({
    data: {
      shipment_number,
      order_id:        input.orderId,
      carrier_name:    input.carrierName,
      tracking_number: input.trackingNumber,
      shipped_at:      new Date(),
    },
  });

  return prisma.order.update({
    where: { id: input.orderId },
    data:  { status: "SHIPPED", shipped_at: new Date() },
  });
}
