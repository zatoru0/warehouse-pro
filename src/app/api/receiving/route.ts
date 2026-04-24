import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingJobSchema } from "@/lib/validators/receiving.schema";
import { nextReceivingNumber } from "@/lib/number-generator";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const jobs = await prisma.receivingJob.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(type && { receiving_type: type as any }),
    },
    include: {
      receiver: { select: { full_name: true } },
      supplier: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = receivingJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const job_number = await nextReceivingNumber();
  const job = await prisma.receivingJob.create({
    data: { ...parsed.data, job_number, received_by: user!.id },
  });

  return NextResponse.json(job, { status: 201 });
}
