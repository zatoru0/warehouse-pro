import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingLineSchema } from "@/lib/validators/receiving.schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const body = await req.json();
  const parsed = receivingLineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const line = await prisma.receivingLine.create({
    data: { ...parsed.data, receiving_job_id: jobId },
  });
  return NextResponse.json(line, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { lineId, received_qty, bin_id } = body;

  const line = await prisma.receivingLine.update({
    where: { id: lineId },
    data: { received_qty, bin_id },
  });
  return NextResponse.json(line);
}
