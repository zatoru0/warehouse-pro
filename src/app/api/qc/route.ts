import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { qcRecordSchema } from "@/lib/validators/qc.schema";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const result = searchParams.get("result");

  const records = await prisma.qcRecord.findMany({
    where: { ...(result && { result: result as never }) },
    include: {
      inspector:      { select: { full_name: true } },
      certifier:      { select: { full_name: true } },
      receiving_job:  { select: { job_number: true } },
      production_job: { select: { job_number: true } },
      product:        { select: { name: true, sku: true, allow_certify: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  // ส่งเข้า QC: ฝ่ายรับเข้า / ผลิต / QC
  const { error, user } = await requireDepartment(req, ["QC", "INBOUND", "PRODUCTION"]);
  if (error) return error;

  const body = await req.json();
  const parsed = qcRecordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const record = await prisma.qcRecord.create({
    data: { ...parsed.data, inspected_by: user!.id },
  });
  return NextResponse.json(record, { status: 201 });
}
