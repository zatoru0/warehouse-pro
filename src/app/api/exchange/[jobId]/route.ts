import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeExchange } from "@/services/exchange.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const job = await prisma.exchangeJob.findUnique({
    where: { id: jobId },
    include: {
      new_product: { select: { name: true, sku: true, unit: true } },
      old_product: { select: { name: true, sku: true, unit: true } },
      customer:    { select: { name: true, phone: true } },
      handler:     { select: { full_name: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { error, user } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const body = await req.json();

  try {
    if (body.action === "complete") {
      const job = await completeExchange(jobId, user!.id);
      return NextResponse.json(job);
    }
    if (body.action === "cancel") {
      const job = await prisma.exchangeJob.update({
        where: { id: jobId },
        data:  { status: "CANCELLED" },
      });
      return NextResponse.json(job);
    }
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}
