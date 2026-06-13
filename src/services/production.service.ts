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
import { createLot } from "./lot.service";
import { writeMovement } from "./stock.service";

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
 * บันทึกผลผลิต + ดันของที่ผลิตได้เข้าสต็อก + ส่ง QC อัตโนมัติถ้าสินค้าต้องตรวจ
 *
 * ตามผัง: ประกอบ → (ส่ง QC) → ตีตรา → พร้อมขาย
 * - ถ้าต้อง QC: ของเข้าคลัง WAIT_QC (รอตรวจ) + สร้าง QcRecord
 * - ถ้าไม่ต้อง QC: ของเข้าคลังพร้อมขาย (READY) ได้เลย
 * ผูกของกับ lot — ถ้างานไม่มี lot จะสร้าง lot ใหม่ให้ (1 batch = 1 lot)
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

  const toQc = sendToQc && job.product.allow_qc;

  if (qtyProduced > 0) {
    // ปลายทางของผลผลิต: รอตรวจ QC หรือ พร้อมขาย
    const targetBin = toQc
      ? await prisma.bin.findFirst({ where: { code: "WAIT_QC" } })
      : await prisma.bin.findFirst({ where: { warehouse: { type: "READY" } } });
    if (!targetBin) {
      throw new Error(
        toQc
          ? "ไม่พบคลัง WAIT_QC สำหรับส่งตรวจ QC"
          : "ไม่พบคลังพร้อมขาย (READY) สำหรับเก็บผลผลิต"
      );
    }

    // ผูก lot — ใช้ของงาน หรือสร้างใหม่ถ้ายังไม่มี
    const lotId =
      job.lot_id ?? (await createLot({ productId: job.product_id })).id;

    await writeMovement({
      productId:     job.product_id,
      lotId,
      toBinId:       targetBin.id,
      type:          "RECEIVE",
      qty:           qtyProduced,
      performedBy,
      referenceType: "production_job",
      referenceId:   jobId,
      notes:         `ผลผลิตจากงาน ${job.job_number}`,
    });

    if (toQc) {
      await prisma.qcRecord.create({
        data: {
          production_job_id: jobId,
          product_id:        job.product_id,
          lot_id:            lotId,
          qty_inspected:     qtyProduced,
          inspected_by:      performedBy,
        },
      });
      await createNotification({
        type:  "QC_PENDING",
        title: `QC รอตรวจ (ผลิต): ${job.product.name}`,
        body:  `งานผลิต ${job.job_number} ผลิต ${qtyProduced} ชิ้น — รอตรวจ QC`,
        link:  "/qc",
      });
    }

    return prisma.productionJob.update({
      where: { id: jobId },
      data: {
        status:       "COMPLETED",
        qty_produced: qtyProduced,
        lot_id:       lotId,
        completed_at: new Date(),
        notes:        notes ?? job.notes,
      },
    });
  }

  return prisma.productionJob.update({
    where: { id: jobId },
    data: {
      status:       "COMPLETED",
      qty_produced: qtyProduced,
      completed_at: new Date(),
      notes:        notes ?? job.notes,
    },
  });
}
