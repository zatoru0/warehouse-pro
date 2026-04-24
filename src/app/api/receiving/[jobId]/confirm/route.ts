import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeMovement } from "@/lib/stock-engine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error, user } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const job = await prisma.receivingJob.findUnique({
    where: { id: jobId },
    include: { lines: { include: { product: true } } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "PENDING" && job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Job already completed" }, { status: 400 });
  }

  for (const line of job.lines) {
    if (!line.bin_id || !line.lot_id || line.received_qty <= 0) continue;

    await writeMovement({
      productId: line.product_id,
      lotId: line.lot_id,
      toBinId: line.bin_id,
      type: "RECEIVE",
      qty: Number(line.received_qty),
      performedBy: user!.id,
      referenceType: "receiving_job",
      referenceId: jobId,
    });

    // Create QC record if product requires QC
    if (line.product.allow_qc) {
      await prisma.qcRecord.create({
        data: {
          receiving_job_id: jobId,
          product_id: line.product_id,
          lot_id: line.lot_id,
          qty_inspected: line.received_qty,
          inspected_by: user!.id,
        },
      });
    }
  }

  await prisma.receivingJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", received_at: new Date() },
  });

  return NextResponse.json({ ok: true });
}
