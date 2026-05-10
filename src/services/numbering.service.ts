/**
 * Auto-generate sequential numbers (RCV-YYYYMMDD-XXXX format)
 * แต่ละ resource มี prefix ของตัวเอง — sequence จะรีเซ็ตทุกวัน
 */
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

const today = () => format(new Date(), "yyyyMMdd");

async function next(prefix: string, current: string | undefined): Promise<string> {
  const date = today();
  if (!current) return `${prefix}-${date}-0001`;
  const seq = parseInt(current.split("-").pop() ?? "0", 10) + 1;
  return `${prefix}-${date}-${String(seq).padStart(4, "0")}`;
}

export async function nextReceivingNumber() {
  const date = today();
  const last = await prisma.receivingJob.findFirst({
    where:   { job_number: { startsWith: `RCV-${date}-` } },
    orderBy: { job_number: "desc" },
    select:  { job_number: true },
  });
  return next("RCV", last?.job_number);
}

export async function nextProductionNumber() {
  const date = today();
  const last = await prisma.productionJob.findFirst({
    where:   { job_number: { startsWith: `PRD-${date}-` } },
    orderBy: { job_number: "desc" },
    select:  { job_number: true },
  });
  return next("PRD", last?.job_number);
}

export async function nextOrderNumber() {
  const date = today();
  const last = await prisma.order.findFirst({
    where:   { order_number: { startsWith: `ORD-${date}-` } },
    orderBy: { order_number: "desc" },
    select:  { order_number: true },
  });
  return next("ORD", last?.order_number);
}

export async function nextShipmentNumber() {
  const date = today();
  const last = await prisma.shipment.findFirst({
    where:   { shipment_number: { startsWith: `SHP-${date}-` } },
    orderBy: { shipment_number: "desc" },
    select:  { shipment_number: true },
  });
  return next("SHP", last?.shipment_number);
}

export async function nextLotNumber() {
  const date = today();
  const last = await prisma.lot.findFirst({
    where:   { lot_number: { startsWith: `LOT-${date}-` } },
    orderBy: { lot_number: "desc" },
    select:  { lot_number: true },
  });
  return next("LOT", last?.lot_number);
}

export async function nextExchangeNumber() {
  const date = today();
  const last = await prisma.exchangeJob.findFirst({
    where:   { job_number: { startsWith: `EXC-${date}-` } },
    orderBy: { job_number: "desc" },
    select:  { job_number: true },
  });
  return next("EXC", last?.job_number);
}

export async function nextRepairNumber() {
  const date = today();
  const last = await prisma.repairJob.findFirst({
    where:   { job_number: { startsWith: `RPR-${date}-` } },
    orderBy: { job_number: "desc" },
    select:  { job_number: true },
  });
  return next("RPR", last?.job_number);
}

export async function nextDisassemblyNumber() {
  const date = today();
  const last = await prisma.disassemblyJob.findFirst({
    where:   { job_number: { startsWith: `DSM-${date}-` } },
    orderBy: { job_number: "desc" },
    select:  { job_number: true },
  });
  return next("DSM", last?.job_number);
}

export async function nextServiceTicketNumber() {
  const date = today();
  const last = await prisma.serviceTicket.findFirst({
    where:   { ticket_number: { startsWith: `ST-${date}-` } },
    orderBy: { ticket_number: "desc" },
    select:  { ticket_number: true },
  });
  return next("ST", last?.ticket_number);
}

export async function nextCreditNoteNumber() {
  const date = today();
  const last = await prisma.creditNote.findFirst({
    where:   { cn_number: { startsWith: `CN-${date}-` } },
    orderBy: { cn_number: "desc" },
    select:  { cn_number: true },
  });
  return next("CN", last?.cn_number);
}

export async function nextInvoiceNumber() {
  const date = today();
  const last = await prisma.invoice.findFirst({
    where:   { invoice_number: { startsWith: `INV-${date}-` } },
    orderBy: { invoice_number: "desc" },
    select:  { invoice_number: true },
  });
  return next("INV", last?.invoice_number);
}
