/**
 * Production workflow — สร้างงานผลิต → เริ่มงาน → บันทึกผลผลิต (ส่ง QC อัตโนมัติได้)
 *
 * Lifecycle:
 *   PENDING → IN_PROGRESS → COMPLETED
 */
import { prisma } from "@/lib/prisma";
import { ProductionPriority } from "@prisma/client";
import { nextProductionNumber } from "./numbering.service";
import { createNotification } from "./notification.service";

export interface CreateJobInput {
  jobType:        string;
  productId:      string;
  qtyPlanned:     number;
  warehouseId:    string;
  lotId?:         string | null;
  assignedTo?:    string | null;
  priority?:      ProductionPriority;
  shouldCertify?: boolean;
  notes?:         string | null;
}

export interface CompleteJobInput {
  jobId:        string;
  qtyProduced:  number;
  sendToQc:     boolean;
  performedBy:  string;
  notes?:       string;
}

export async function createJob(input: CreateJobInput) {
  const job_number = await nextProductionNumber();
  const job = await prisma.productionJob.create({
    data: {
      job_number,
      job_type:       input.jobType,
      product_id:     input.productId,
      qty_planned:    input.qtyPlanned,
      warehouse_id:   input.warehouseId,
      lot_id:         input.lotId,
      assigned_to:    input.assignedTo,
      priority:       input.priority       ?? "NORMAL",
      should_certify: input.shouldCertify  ?? false,
      notes:          input.notes,
    },
    include: { product: { select: { name: true } } },
  });
  const urgentTag = input.priority === "URGENT" ? "🚨 ด่วนมาก " : "";
  await createNotification({
    type:  "PRODUCTION_PENDING",
    title: `${urgentTag}งานผลิตใหม่: ${job_number}`,
    body:  `${job.product.name} — วางแผน ${input.qtyPlanned} ชิ้น${input.shouldCertify ? " · ต้องตีตรา" : ""}`,
    link:  `/production`,
  });
  return job;
}

export async function startJob(jobId: string) {
  const job = await prisma.productionJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("ไม่พบงานผลิต");
  if (job.status !== "PENDING") throw new Error("งานเริ่มไปแล้ว");

  return prisma.productionJob.update({
    where: { id: jobId },
    data:  { status: "IN_PROGRESS", started_at: new Date() },
  });
}

/**
 * บันทึกผลผลิต + ส่ง QC อัตโนมัติถ้าสินค้าต้องตรวจ
 */
export async function completeJob(input: CompleteJobInput) {
  const { jobId, qtyProduced, sendToQc, performedBy, notes } = input;

  const job = await prisma.productionJob.findUnique({
    where:   { id: jobId },
    include: { product: true },
  });
  if (!job) throw new Error("ไม่พบงานผลิต");
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    throw new Error("งานเสร็จสิ้นแล้ว");
  }

  const updated = await prisma.productionJob.update({
    where: { id: jobId },
    data: {
      status:       "COMPLETED",
      qty_produced: qtyProduced,
      completed_at: new Date(),
      notes:        notes ?? job.notes,
    },
  });

  if (sendToQc && job.product.allow_qc && qtyProduced > 0) {
    await prisma.qcRecord.create({
      data: {
        production_job_id: jobId,
        product_id:        job.product_id,
        lot_id:            job.lot_id,
        qty_inspected:     qtyProduced,
        inspected_by:      performedBy,
      },
    });
  }

  return updated;
}
