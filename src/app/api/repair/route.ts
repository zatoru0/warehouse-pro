import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRepairJob } from "@/services/repair.service";
import { z } from "zod";

// ✨ เพิ่มบรรทัดนี้: บังคับไม่ให้ Next.js จำข้อมูลเก่า (Disable Cache)
export const dynamic = "force-dynamic";

const schema = z.object({
  productId:   z.string(),
  lotId:       z.string().optional().nullable(),
  customerId:  z.string().optional().nullable(),
  issueDesc:   z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.repairJob.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      product:  { select: { name: true, sku: true } },
      customer: { select: { name: true } },
      receiver: { select: { full_name: true } },
      assignee: { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  // รับเครื่องซ่อม: รับเข้า / เคลมหลังการขาย / ฝ่ายผลิต
  const { error, user } = await requireDepartment(req, ["INBOUND", "AFTER_SALES", "PRODUCTION"]);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const job = await createRepairJob({ ...parsed.data, receivedBy: user!.id });
    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}