import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDisassemblyJob } from "@/services/disassembly.service";
import { z } from "zod";

const partSchema = z.object({
  productId: z.string(),
  qty:       z.number().positive(),
  toBinId:   z.string().optional().nullable(),
});

const schema = z.object({
  productId:  z.string(),
  lotId:      z.string(),
  fromBinId:  z.string(),
  qty:        z.number().positive(),
  parts:      z.array(partSchema).min(1),
  notes:      z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const jobs = await prisma.disassemblyJob.findMany({
    include: {
      product:   { select: { name: true, sku: true } },
      performer: { select: { full_name: true } },
      parts:     { include: { product: { select: { name: true } } } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
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
    const job = await createDisassemblyJob({ ...parsed.data, performedBy: user!.id });
    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}
