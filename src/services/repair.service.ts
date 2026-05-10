import { prisma } from "@/lib/prisma";
import { writeMovement } from "./stock.service";
import { nextRepairNumber } from "./numbering.service";
import { createNotification } from "./notification.service";
import type { RepairStatus } from "@prisma/client";

export interface CreateRepairInput {
  productId:   string;
  lotId?:      string | null;
  customerId?: string | null;
  issueDesc?:  string | null;
  receivedBy:  string;
}

export async function createRepairJob(input: CreateRepairInput) {
  const job_number = await nextRepairNumber();
  const job = await prisma.repairJob.create({
    data: {
      job_number,
      product_id:  input.productId,
      lot_id:      input.lotId,
      customer_id: input.customerId,
      issue_desc:  input.issueDesc,
      received_by: input.receivedBy,
    },
    include: { product: { select: { name: true } } },
  });
  return job;
}

export async function updateRepairStatus(
  jobId: string,
  status: RepairStatus,
  opts?: { repairNote?: string; assignedTo?: string; performedBy?: string }
) {
  const job = await prisma.repairJob.findUnique({
    where: { id: jobId },
    include: { product: true },
  });
  if (!job) throw new Error("ไม่พบงานซ่อม");
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    throw new Error("งานนี้เสร็จสิ้นแล้ว");
  }

  const data: Record<string, unknown> = { status };
  if (opts?.repairNote) data.repair_note = opts.repairNote;
  if (opts?.assignedTo) data.assigned_to = opts.assignedTo;
  if (status === "COMPLETED") data.completed_at = new Date();

  const updated = await prisma.repairJob.update({ where: { id: jobId }, data });

  if (status === "COMPLETED") {
    await createNotification({
      type:  "RECEIVING_DONE",
      title: `ซ่อมเสร็จ: ${job.product.name}`,
      body:  `งาน ${job.job_number} ซ่อมเสร็จเรียบร้อย`,
      link:  `/repair/${jobId}`,
      targetDepartments: ["PRODUCTION", "AFTER_SALES"],
    });
  }

  return updated;
}

export async function completeRepairWithQc(
  jobId: string,
  performedBy: string,
  opts?: { repairNote?: string }
) {
  const job = await prisma.repairJob.findUnique({
    where:   { id: jobId },
    include: { product: true },
  });
  if (!job) throw new Error("ไม่พบงานซ่อม");

  await prisma.qcRecord.create({
    data: {
      repair_job_id: jobId,
      product_id:    job.product_id,
      lot_id:        job.lot_id,
      qty_inspected: 1,
      inspected_by:  performedBy,
    },
  });

  await createNotification({
    type:  "QC_PENDING",
    title: `QC รอตรวจ (ซ่อม): ${job.product.name}`,
    body:  `งานซ่อม ${job.job_number} รอการตรวจ QC`,
    link:  `/qc`,
  });

  return prisma.repairJob.update({
    where: { id: jobId },
    data: {
      status:      "WAIT_QC",
      repair_note: opts?.repairNote,
    },
  });
}
