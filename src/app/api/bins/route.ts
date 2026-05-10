import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const binSchema = z.object({
  warehouse_id: z.string().min(1),
  code:         z.string().min(1),
  zone_code:    z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");

  const bins = await prisma.bin.findMany({
    where: {
      is_active: true,
      ...(warehouseId && { warehouse_id: warehouseId }),
    },
    include: {
      warehouse: { select: { id: true, name: true, type: true, code: true } },
    },
    orderBy: [{ zone_code: "asc" }, { code: "asc" }],
  });

  return NextResponse.json(bins);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = binSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const bin = await prisma.bin.create({ data: parsed.data });
    return NextResponse.json(bin, { status: 201 });
  } catch {
    return NextResponse.json({ error: "รหัส Bin นี้มีในคลังแล้ว" }, { status: 409 });
  }
}
