import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PurchaseOrderStatus, POTransitStatus } from "@prisma/client";
import { createNotification } from "@/services/notification.service";

const patchSchema = z.object({
  status:          z.nativeEnum(PurchaseOrderStatus).optional(),
  expected_date:   z.string().optional().nullable(),
  reference_doc:   z.string().optional().nullable(),
  notes:           z.string().optional().nullable(),
  approved_by:     z.string().optional().nullable(),

  // Transit
  transit_status:  z.nativeEnum(POTransitStatus).optional(),
  carrier:         z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where:   { id },
    include: {
      supplier: true,
      creator:  { select: { id: true, full_name: true } },
      approver: { select: { id: true, full_name: true } },
      lines: {
        include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
      },
    },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.expected_date) data.expected_date = new Date(parsed.data.expected_date);

  // auto-fill approver when status moves to SENT
  if (parsed.data.status === "SENT" && !parsed.data.approved_by) {
    data.approved_by = user!.id;
  }

  // Transit timestamps
  const now = new Date();
  if (parsed.data.transit_status === "IN_TRANSIT") {
    data.in_transit_at = now;
    data.shipped_at    = now;
  }
  if (parsed.data.transit_status === "ARRIVED") {
    data.arrived_at = now;
  }

  const po = await prisma.purchaseOrder.update({ where: { id }, data });

  // Notify on transit changes
  if (parsed.data.transit_status === "IN_TRANSIT") {
    await createNotification({
      type:  "PO_DUE",
      title: `📦 PO ${po.po_number} ออกเดินทางแล้ว`,
      body:  po.expected_date ? `คาดว่าจะถึงคลัง ${new Date(po.expected_date).toLocaleDateString("th-TH")}` : "กำลังเดินทางมาคลัง",
      link:  `/purchase-orders/${po.id}`,
    });
  }
  if (parsed.data.transit_status === "ARRIVED") {
    await createNotification({
      type:  "PO_DUE",
      title: `✅ PO ${po.po_number} มาถึงคลังแล้ว`,
      body:  "พร้อมรับเข้าระบบ",
      link:  `/receiving/new?po=${po.po_number}&ref=${po.po_number}`,
    });
  }

  return NextResponse.json(po);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;

  const { id } = await params;
  await prisma.purchaseOrder.update({
    where: { id },
    data:  { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
