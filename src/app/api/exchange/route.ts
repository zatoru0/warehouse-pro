import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExchange } from "@/services/exchange.service";
import { z } from "zod";

const schema = z.object({
  customerId:   z.string().optional().nullable(),
  newProductId: z.string(),
  newLotId:     z.string().optional().nullable(),
  newBinId:     z.string().optional().nullable(),
  oldProductId: z.string(),
  oldLotId:     z.string().optional().nullable(),
  notes:        z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const jobs = await prisma.exchangeJob.findMany({
    include: {
      new_product: { select: { name: true, sku: true } },
      old_product: { select: { name: true, sku: true } },
      customer:    { select: { name: true } },
      handler:     { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const job = await createExchange({ ...parsed.data, handledBy: user!.id });
    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}
