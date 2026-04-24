import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

function datePart() {
  return format(new Date(), "yyyyMMdd");
}

async function nextSeq(prefix: string): Promise<string> {
  const today = datePart();
  const pattern = `${prefix}-${today}-%`;

  const rows = await prisma.$queryRaw<{ job_number: string }[]>`
    SELECT job_number FROM (
      SELECT job_number FROM receiving_jobs WHERE job_number LIKE ${pattern}
      UNION ALL
      SELECT job_number FROM production_jobs WHERE job_number LIKE ${pattern}
      UNION ALL
      SELECT order_number AS job_number FROM orders WHERE order_number LIKE ${pattern}
      UNION ALL
      SELECT shipment_number AS job_number FROM shipments WHERE shipment_number LIKE ${pattern}
    ) t
    ORDER BY job_number DESC
    LIMIT 1
  `;

  if (rows.length === 0) return `${prefix}-${today}-0001`;
  const last = rows[0].job_number;
  const seq = parseInt(last.split("-").pop() ?? "0", 10) + 1;
  return `${prefix}-${today}-${String(seq).padStart(4, "0")}`;
}

export async function nextReceivingNumber() {
  const today = datePart();
  const pattern = `RCV-${today}-%`;
  const rows = await prisma.$queryRaw<{ job_number: string }[]>`
    SELECT job_number FROM receiving_jobs WHERE job_number LIKE ${pattern} ORDER BY job_number DESC LIMIT 1
  `;
  if (rows.length === 0) return `RCV-${today}-0001`;
  const seq = parseInt(rows[0].job_number.split("-").pop() ?? "0", 10) + 1;
  return `RCV-${today}-${String(seq).padStart(4, "0")}`;
}

export async function nextProductionNumber() {
  const today = datePart();
  const pattern = `PRD-${today}-%`;
  const rows = await prisma.$queryRaw<{ job_number: string }[]>`
    SELECT job_number FROM production_jobs WHERE job_number LIKE ${pattern} ORDER BY job_number DESC LIMIT 1
  `;
  if (rows.length === 0) return `PRD-${today}-0001`;
  const seq = parseInt(rows[0].job_number.split("-").pop() ?? "0", 10) + 1;
  return `PRD-${today}-${String(seq).padStart(4, "0")}`;
}

export async function nextOrderNumber() {
  const today = datePart();
  const pattern = `ORD-${today}-%`;
  const rows = await prisma.$queryRaw<{ order_number: string }[]>`
    SELECT order_number FROM orders WHERE order_number LIKE ${pattern} ORDER BY order_number DESC LIMIT 1
  `;
  if (rows.length === 0) return `ORD-${today}-0001`;
  const seq = parseInt(rows[0].order_number.split("-").pop() ?? "0", 10) + 1;
  return `ORD-${today}-${String(seq).padStart(4, "0")}`;
}

export async function nextShipmentNumber() {
  const today = datePart();
  const pattern = `SHP-${today}-%`;
  const rows = await prisma.$queryRaw<{ shipment_number: string }[]>`
    SELECT shipment_number FROM shipments WHERE shipment_number LIKE ${pattern} ORDER BY shipment_number DESC LIMIT 1
  `;
  if (rows.length === 0) return `SHP-${today}-0001`;
  const seq = parseInt(rows[0].shipment_number.split("-").pop() ?? "0", 10) + 1;
  return `SHP-${today}-${String(seq).padStart(4, "0")}`;
}

export async function nextLotNumber(productId: string) {
  const today = datePart();
  const pattern = `LOT-${today}-%`;
  const rows = await prisma.$queryRaw<{ lot_number: string }[]>`
    SELECT lot_number FROM lots WHERE lot_number LIKE ${pattern} ORDER BY lot_number DESC LIMIT 1
  `;
  if (rows.length === 0) return `LOT-${today}-0001`;
  const seq = parseInt(rows[0].lot_number.split("-").pop() ?? "0", 10) + 1;
  return `LOT-${today}-${String(seq).padStart(4, "0")}`;
}
