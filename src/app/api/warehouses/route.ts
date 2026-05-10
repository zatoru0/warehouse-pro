import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { WarehouseType } from "@prisma/client";

const warehouseSchema = z.object({
  code:    z.string().min(1),
  name:    z.string().min(1),
  name_th: z.string().optional().nullable(),
  type:    z.nativeEnum(WarehouseType),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const warehouses = await prisma.warehouse.findMany({
    where: { is_active: true },
    include: {
      _count: { select: { bins: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(warehouses);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = warehouseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const warehouse = await prisma.warehouse.create({ data: parsed.data });
  return NextResponse.json(warehouse, { status: 201 });
}
