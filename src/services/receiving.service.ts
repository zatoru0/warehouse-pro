/**
 * Receiving workflow — สร้างงานรับสินค้า → เพิ่ม lines → ยืนยัน (สร้าง stock movements)
 *
 * Lifecycle:
 *   PENDING → IN_PROGRESS → COMPLETED
 *
 * confirmReceiving() เป็น operation สำคัญที่ต้องเป็น atomic — เรียก writeMovement()
 * สำหรับทุก line ที่กรอกครบ (bin + lot + qty > 0)
 */
import { prisma } from "@/lib/prisma";
import { writeMovement } from "./stock.service";
import { nextReceivingNumber } from "./numbering.service";
import { createNotification, checkLowStock } from "./notification.service";
import type { ReceivingType } from "@prisma/client";

export interface CreateJobInput {
  receivingType: ReceivingType;
  warehouseId:   string;
  supplierId?:   string | null;
  customerId?:   string | null;
  referenceDoc?: string | null;
  notes?:        string | null;
  receivedBy:    string;
}

export interface AddLineInput {
  jobId:        string;
  productId:    string;
  expectedQty:  number;
  unitCost?:    number;
  notes?:       string | null;
}

export interface UpdateLineInput {
  lineId:       string;
  receivedQty?: number;
  unitCost?:    number;
  binId?:       string | null;
  lotId?:       string | null;
}

/**
 * ตามผัง Update Weekly: REPAIR → สต็อกฝ่ายช่าง (PRODUCTION_REPAIR),
 * NEW_GOODS / PARTS → สต็อกหลัก (STOCK)
 */
const REQUIRED_WAREHOUSE_TYPE: Partial<Record<ReceivingType, "STOCK" | "PRODUCTION_REPAIR">> = {
  NEW_GOODS:         "STOCK",
  PARTS:             "STOCK",
  REPAIR:            "PRODUCTION_REPAIR",
};

export async function createJob(input: CreateJobInput) {
  const required = REQUIRED_WAREHOUSE_TYPE[input.receivingType];
  if (required) {
    const wh = await prisma.warehouse.findUnique({
      where:  { id: input.warehouseId },
      select: { type: true },
    });
    if (!wh) throw new Error("ไม่พบคลังปลายทาง");
    if (wh.type !== required) {
      throw new Error(
        input.receivingType === "REPAIR"
          ? "รับเครื่องซ่อมต้องเข้าคลังประเภทสต็อกฝ่ายช่าง (PRODUCTION_REPAIR)"
          : "ประเภทรับเข้านี้ต้องเข้าคลังประเภทสต็อกหลัก (STOCK)"
      );
    }
  }

  const job_number = await nextReceivingNumber();
  return prisma.receivingJob.create({
    data: {
      job_number,
      receiving_type: input.receivingType,
      warehouse_id:   input.warehouseId,
      supplier_id:    input.supplierId,
      customer_id:    input.customerId,
      reference_doc:  input.referenceDoc,
      notes:          input.notes,
      received_by:    input.receivedBy,
    },
  });
}

export async function addLine(input: AddLineInput) {
  // Pre-fill bin จาก Product.default_bin_id ตามผัง — ต่อเมื่อ default bin อยู่คลังเดียวกับงานรับเข้า
  const [product, job] = await Promise.all([
    prisma.product.findUnique({
      where:  { id: input.productId },
      select: { default_bin_id: true },
    }),
    prisma.receivingJob.findUnique({
      where:  { id: input.jobId },
      select: { warehouse_id: true },
    }),
  ]);

  let defaultBinId: string | null = null;
  if (product?.default_bin_id && job) {
    const bin = await prisma.bin.findUnique({
      where:  { id: product.default_bin_id },
      select: { warehouse_id: true },
    });
    if (bin?.warehouse_id === job.warehouse_id) {
      defaultBinId = product.default_bin_id;
    }
  }

  return prisma.receivingLine.create({
    data: {
      receiving_job_id: input.jobId,
      product_id:       input.productId,
      expected_qty:     input.expectedQty,
      unit_cost:        input.unitCost ?? 0,
      bin_id:           defaultBinId,
      notes:            input.notes,
    },
  });
}

export async function updateLine(input: UpdateLineInput) {
  return prisma.receivingLine.update({
    where: { id: input.lineId },
    data: {
      ...(input.receivedQty !== undefined && { received_qty: input.receivedQty }),
      ...(input.unitCost !== undefined    && { unit_cost:     input.unitCost }),
      ...(input.binId !== undefined        && { bin_id:        input.binId }),
      ...(input.lotId !== undefined        && { lot_id:        input.lotId }),
    },
  });
}

/**
 * ยืนยันการรับเข้า → สร้าง stock movement สำหรับทุก line ที่พร้อม
 * - เฉพาะ line ที่มี bin_id, lot_id และ received_qty > 0
 * - บันทึก qc_records อัตโนมัติถ้าสินค้าต้องตรวจ QC
 */
export async function confirmJob(jobId: string, performedBy: string) {
  const job = await prisma.receivingJob.findUnique({
    where: { id: jobId },
    include: { lines: { include: { product: true } } },
  });
  if (!job) throw new Error("ไม่พบงานรับสินค้า");
  if (job.status !== "PENDING" && job.status !== "IN_PROGRESS") {
    throw new Error("งานนี้เสร็จสิ้นแล้ว");
  }

  for (const line of job.lines) {
    if (!line.bin_id || !line.lot_id || Number(line.received_qty) <= 0) continue;

    await writeMovement({
      productId:     line.product_id,
      lotId:         line.lot_id,
      toBinId:       line.bin_id,
      type:          "RECEIVE",
      qty:           Number(line.received_qty),
      performedBy,
      referenceType: "receiving_job",
      referenceId:   jobId,
    });

    if (line.product.allow_qc) {
      await prisma.qcRecord.create({
        data: {
          receiving_job_id: jobId,
          product_id:       line.product_id,
          lot_id:           line.lot_id,
          qty_inspected:    line.received_qty,
          inspected_by:     performedBy,
        },
      });
      await createNotification({
        type:  "QC_PENDING",
        title: `QC รอตรวจ: ${line.product.name}`,
        body:  `รับเข้า ${Number(line.received_qty)} ชิ้น — รอการตรวจสอบคุณภาพ`,
        link:  "/qc",
      });
    }

    await checkLowStock(line.product_id);
  }

  const updated = await prisma.receivingJob.update({
    where: { id: jobId },
    data:  { status: "COMPLETED", received_at: new Date() },
  });

  await createNotification({
    type:  "RECEIVING_DONE",
    title: `รับสินค้าเสร็จสิ้น: ${job.job_number}`,
    body:  `รับเข้า ${job.lines.length} รายการเรียบร้อยแล้ว`,
    link:  `/receiving/${jobId}`,
  });

  return updated;
}
