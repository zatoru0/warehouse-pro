import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingJobSchema } from "@/lib/validators/receiving.schema";
import { createJob } from "@/services/receiving.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type   = searchParams.get("type");

  const jobs = await prisma.receivingJob.findMany({
    where: {
      ...(status && { status: status as never }),
      ...(type   && { receiving_type: type as never }),
    },
    include: {
      receiver: { select: { full_name: true } },
      supplier: { select: { name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireDepartment(req, ["INBOUND"]);
  if (error) return error;

  const body = await req.json();
  const parsed = receivingJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const job = await createJob({
      receivingType: parsed.data.receiving_type,
      warehouseId:   parsed.data.warehouse_id,
      supplierId:    parsed.data.supplier_id,
      customerId:    parsed.data.customer_id,
      referenceDoc:  parsed.data.reference_doc,
      notes:         parsed.data.notes,
      receivedBy:    user!.id,
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { formErrors: [err instanceof Error ? err.message : "เกิดข้อผิดพลาด"] } },
      { status: 422 }
    );
  }
}
