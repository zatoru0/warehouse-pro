import { prisma } from "@/lib/prisma";
import { writeMovement } from "./stock.service";
import { nextDisassemblyNumber } from "./numbering.service";
import { nextLotNumber } from "./numbering.service";

export interface PartInput {
  productId: string;
  qty:       number;
  toBinId?:  string | null;
}

export interface CreateDisassemblyInput {
  productId:   string;
  lotId:       string;
  fromBinId:   string;
  qty:         number;
  parts:       PartInput[];
  notes?:      string | null;
  performedBy: string;
}

export async function createDisassemblyJob(input: CreateDisassemblyInput) {
  const job_number = await nextDisassemblyNumber();

  const job = await prisma.disassemblyJob.create({
    data: {
      job_number,
      product_id:  input.productId,
      lot_id:      input.lotId,
      from_bin_id: input.fromBinId,
      qty:         input.qty,
      notes:       input.notes,
      performed_by: input.performedBy,
      parts: {
        create: input.parts.map((p) => ({
          product_id: p.productId,
          qty:        p.qty,
          to_bin_id:  p.toBinId,
        })),
      },
    },
    include: { parts: true },
  });

  // หักสินค้าหลักออกจาก stock
  await writeMovement({
    productId:     input.productId,
    lotId:         input.lotId,
    fromBinId:     input.fromBinId,
    type:          "DISASSEMBLY_OUT",
    qty:           input.qty,
    performedBy:   input.performedBy,
    referenceType: "disassembly_job",
    referenceId:   job.id,
    notes:         input.notes ?? undefined,
  });

  // เพิ่มชิ้นส่วนแต่ละรายการเข้า stock
  for (const part of job.parts) {
    if (!part.to_bin_id) continue;
    // สร้าง lot อัตโนมัติสำหรับชิ้นส่วน
    const lotNumber = await nextLotNumber();
    const barcode = `${lotNumber}-${part.product_id.slice(-6)}`;
    const lot = await prisma.lot.create({
      data: {
        product_id: part.product_id,
        lot_number: lotNumber,
        barcode,
      },
    });

    await writeMovement({
      productId:     part.product_id,
      lotId:         lot.id,
      toBinId:       part.to_bin_id,
      type:          "DISASSEMBLY_IN",
      qty:           Number(part.qty),
      performedBy:   input.performedBy,
      referenceType: "disassembly_job",
      referenceId:   job.id,
    });
  }

  return prisma.disassemblyJob.update({
    where: { id: job.id },
    data:  { status: "COMPLETED", completed_at: new Date() },
  });
}
