import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productionJobSchema } from "@/lib/validators/production.schema";
import { nextProductionNumber } from "@/lib/number-generator";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.productionJob.findMany({
    where: { ...(status && { status: status as any }) },
    include: {
      assigned_user: { select: { full_name: true } },
      _count: { select: { consumption_lines: true } },
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
  const parsed = productionJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const job_number = await nextProductionNumber();

  // Pre-populate BOM consumption lines if ASSEMBLY
  const bomLines =
    parsed.data.job_type === "ASSEMBLY"
      ? await prisma.bomLine.findMany({ where: { parent_id: parsed.data.product_id } })
      : [];

  const job = await prisma.productionJob.create({
    data: {
      ...parsed.data,
      job_number,
      consumption_lines: {
        create: bomLines.map((b) => ({
          product_id: b.component_id,
          qty_planned: Number(b.qty_required) * parsed.data.qty_planned,
        })),
      },
    },
  });

  return NextResponse.json(job, { status: 201 });
}
