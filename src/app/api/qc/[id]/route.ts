import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const record = await prisma.qcRecord.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, sku: true } },
      inspector: { select: { full_name: true } },
      receiving_job: { select: { job_number: true } },
      production_job: { select: { job_number: true } },
    },
  });

  if (!record) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  return NextResponse.json(record);
}
