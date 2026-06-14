import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRepairStatus, completeRepairWithQc } from "@/services/repair.service";
import { z } from "zod";

const patchSchema = z.object({
  action:      z.enum([
    "start", 
    "complete_qc", 
    "complete", 
    "cancel",
    "request_disassembly",
    "complete_qc_customer",
    "complete_qc_internal",
    "send_to_shipping"
  ]),
  repairNote:  z.string().optional(),
  assignedTo:  z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const job = await prisma.repairJob.findUnique({
    where: { id: jobId },
    include: {
      product:    { select: { name: true, sku: true, unit: true } },
      customer:   { select: { name: true, phone: true } },
      receiver:   { select: { full_name: true } },
      assignee:   { select: { full_name: true } },
      qc_records: {
        include: { inspector: { select: { full_name: true } } },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "ไม่พบงานซ่อม" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { error, user } = await requireDepartment(req, ["PRODUCTION", "AFTER_SALES"]);
  if (error) return error;
  const { jobId } = await params;

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const { action, repairNote, assignedTo } = parsed.data;

    // ✨ เงื่อนไขใหม่: งานซ่อม QC ผ่าน -> ยืนยันและส่งไปจัดส่ง
    if (action === "send_to_shipping") {
      // 1. ปิดงานซ่อม
      const job = await updateRepairStatus(jobId, "COMPLETED", { 
        repairNote: `[เตรียมจัดส่ง] ${repairNote || ""}`.trim(), 
        performedBy: user!.id 
      });

      // 2. ดึงข้อมูลงานซ่อมและย้ายสต็อกไปยังคลังจัดส่งอัตโนมัติ พร้อมสร้างรายการจัดส่ง
      await prisma.$transaction(async (tx) => {
        const currentJob = await tx.repairJob.findUnique({ where: { id: jobId } });
        if (!currentJob) throw new Error("❌ ไม่พบข้อมูลงานซ่อมในระบบ");

        // 🚨 แก้ไขจุดนี้: ค้นหาคลังจัดส่งแบบยืดหยุ่นอัจฉริยะ (ค้นหาครอบคลุมทั้ง Code และ Warehouse Type)
        const shippingBin = await tx.bin.findFirst({ 
          where: {
            OR: [
              { code: "SHIPPING_BIN" },
              { code: "SHIPPING" },
              { code: "READY" },
              { code: "READY_BIN" },
              { warehouse: { type: "SHIPPING" } },
              { warehouse: { type: "READY" } }
            ]
          }
        }); 
        
        if (!shippingBin) throw new Error("❌ ข้อมูลคลังสินค้าผิดพลาด: ไม่พบถังเก็บสต็อกหรือคลังสินค้าประเภท SHIPPING หรือ READY ในระบบ");
          
        // โอนสต็อกเข้าคลังจัดส่ง (ถ้ามี lot_id)
        if (currentJob.lot_id) {
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: currentJob.product_id, lot_id: currentJob.lot_id, bin_id: shippingBin.id } },
            update: { qty_on_hand: { increment: 1 } },
            create: { product_id: currentJob.product_id, lot_id: currentJob.lot_id, bin_id: shippingBin.id, qty_on_hand: 1 }
          });

          await tx.stockMovement.create({
            data: {
              product_id: currentJob.product_id, lot_id: currentJob.lot_id, movement_type: "TRANSFER", reference_type: "REPAIR",
              qty: 1, to_bin_id: shippingBin.id, performed_by: user!.id,
              notes: "ซ่อมเสร็จและ QC ผ่าน: โอนย้ายสินค้ารอจัดส่งคืนลูกค้า",
            }
          });
        }

        // สร้าง Order เพื่อให้เด้งไปขึ้นที่หน้าจอจัดส่ง (สถานะ PICKING เพื่อให้เข้าคิวเบิกสินค้าทันที)
        await tx.order.create({
          data: {
            order_number: `RET-RP-${Date.now()}`, 
            channel: "CLAIM", 
            customer_id: currentJob.customer_id,
            status: "PICKING", 
            notes: `ส่งคืนสินค้างานซ่อม (อ้างอิงใบงาน: ${currentJob.job_number})`,
            handled_by: user!.id,
            lines: {
              create: [
                {
                  product_id: currentJob.product_id,
                  qty: 1,
                  unit_price: 0, 
                  notes: "เครื่องส่งคืนจากฝ่ายซ่อมหลังผ่าน QC",
                }
              ]
            }
          }
        });
      });

      return NextResponse.json(job);
    }

    if (action === "start") {
      const job = await updateRepairStatus(jobId, "IN_REPAIR", { assignedTo, performedBy: user!.id });
      return NextResponse.json(job);
    }
    
    if (action === "complete_qc_customer" || action === "complete_qc_internal") {
      const prefixNote = action === "complete_qc_customer" ? "[ส่งคืนลูกค้า]" : "[เก็บเข้าคลัง]";
      const job = await completeRepairWithQc(jobId, user!.id, { 
        repairNote: `${prefixNote} ${repairNote || ""}`.trim()
      });
      return NextResponse.json(job);
    }
    
    if (action === "request_disassembly") {
      const job = await updateRepairStatus(jobId, "COMPLETED", { 
        repairNote: `[ขอแยกชิ้นส่วน] ${repairNote || ""}`.trim(), 
        performedBy: user!.id 
      });
      return NextResponse.json(job);
    }

    if (action === "complete_qc") {
      const job = await completeRepairWithQc(jobId, user!.id, { repairNote });
      return NextResponse.json(job);
    }
    if (action === "complete") {
      const job = await updateRepairStatus(jobId, "COMPLETED", { repairNote, performedBy: user!.id });
      return NextResponse.json(job);
    }
    if (action === "cancel") {
      const job = await updateRepairStatus(jobId, "CANCELLED");
      return NextResponse.json(job);
    }
    
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}