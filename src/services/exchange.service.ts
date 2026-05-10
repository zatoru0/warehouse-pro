import { prisma } from "@/lib/prisma";
import { writeMovement } from "./stock.service";
import { nextExchangeNumber } from "./numbering.service";
import { createNotification } from "./notification.service";

export interface CreateExchangeInput {
  customerId?:   string | null;
  newProductId:  string;
  newLotId?:     string | null;
  newBinId?:     string | null;
  oldProductId:  string;
  oldLotId?:     string | null;
  notes?:        string | null;
  handledBy:     string;
}

export async function createExchange(input: CreateExchangeInput) {
  const job_number = await nextExchangeNumber();
  return prisma.exchangeJob.create({
    data: {
      job_number,
      customer_id:    input.customerId,
      new_product_id: input.newProductId,
      new_lot_id:     input.newLotId,
      new_bin_id:     input.newBinId,
      old_product_id: input.oldProductId,
      old_lot_id:     input.oldLotId,
      notes:          input.notes,
      handled_by:     input.handledBy,
    },
  });
}

export async function completeExchange(jobId: string, performedBy: string) {
  const job = await prisma.exchangeJob.findUnique({
    where:   { id: jobId },
    include: { new_product: true, old_product: true, customer: true },
  });
  if (!job) throw new Error("ไม่พบงานแลกเปลี่ยน");
  if (job.status !== "PENDING") throw new Error("งานนี้ดำเนินการแล้ว");

  // Issue เครื่องใหม่ออกจาก stock
  if (job.new_lot_id && job.new_bin_id) {
    await writeMovement({
      productId:     job.new_product_id,
      lotId:         job.new_lot_id,
      fromBinId:     job.new_bin_id,
      type:          "ISSUE",
      qty:           1,
      performedBy,
      referenceType: "exchange_job",
      referenceId:   job.id,
      notes:         `แลกเครื่อง ${job.job_number}`,
    });
  }

  await createNotification({
    type:  "ORDER_PENDING",
    title: `แลกเครื่องเสร็จสิ้น: ${job.job_number}`,
    body:  `${job.new_product.name} → ส่งมอบลูกค้า ${job.customer?.name ?? ""}`,
    link:  `/exchange`,
  });

  return prisma.exchangeJob.update({
    where: { id: job.id },
    data:  { status: "COMPLETED", completed_at: new Date() },
  });
}
