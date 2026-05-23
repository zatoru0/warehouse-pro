import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRepairStatus, completeRepairWithQc } from "@/services/repair.service";
import { z } from "zod";

const patchSchema = z.object({
  action:      z.enum(["start", "complete_qc", "complete", "cancel"]),
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
  const { error, user } = await requireDepartment(req, ["PRODUCTION"]);
  if (error) return error;
  const { jobId } = await params;

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const { action, repairNote, assignedTo } = parsed.data;

    if (action === "start") {
      const job = await updateRepairStatus(jobId, "IN_REPAIR", { assignedTo, performedBy: user!.id });
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
