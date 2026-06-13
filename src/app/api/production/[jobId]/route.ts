import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const job = await prisma.productionJob.findUnique({
    where: { id: jobId },
    include: {
      product: { select: { name: true, sku: true, unit: true, allow_qc: true } },
      lot: true,
      warehouse: { select: { name: true, code: true, type: true } },
      assigned_user: { select: { full_name: true } },
      qc_records: true,
      bom_lines: {
        include: {
          material: { select: { name: true, sku: true, unit: true } },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "ไม่พบงานผลิต" }, { status: 404 });
  return NextResponse.json(job);
}
