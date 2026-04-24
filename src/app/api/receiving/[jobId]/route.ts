import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const job = await prisma.receivingJob.findUnique({
    where: { id: jobId },
    include: {
      receiver: { select: { full_name: true } },
      supplier: true,
      lines: { include: { product: true, lot: true } },
      qc_records: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;
  const body = await req.json();

  const job = await prisma.receivingJob.update({
    where: { id: jobId },
    data: { status: body.status, notes: body.notes },
  });
  return NextResponse.json(job);
}
