import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productionJobSchema } from "@/lib/validators/production.schema";
import { createJob } from "@/services/production.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.productionJob.findMany({
    where: { ...(status && { status: status as never }) },
    include: {
      assigned_user: { select: { full_name: true } },
      product:       { select: { name: true, sku: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = productionJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const job = await createJob({
    jobType:       parsed.data.job_type,
    productId:     parsed.data.product_id,
    qtyPlanned:    parsed.data.qty_planned,
    warehouseId:   parsed.data.warehouse_id,
    lotId:         parsed.data.lot_id,
    assignedTo:    parsed.data.assigned_to,
    priority:      parsed.data.priority,
    shouldCertify: parsed.data.should_certify,
    notes:         parsed.data.notes,
  });
  return NextResponse.json(job, { status: 201 });
}
