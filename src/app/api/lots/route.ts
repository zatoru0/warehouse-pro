import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLot } from "@/services/lot.service";
import { z } from "zod";

const schema = z.object({
  product_id:      z.string().min(1),
  manufactured_at: z.string().optional().nullable(),
  expires_at:      z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const status    = searchParams.get("status");

  const lots = await prisma.lot.findMany({
    where: {
      ...(productId && { product_id: productId }),
      ...(status    && { status: status as never }),
    },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return NextResponse.json(lots);
}

export async function POST(req: NextRequest) {
  const { error } = await requireDepartment(req, ["WAREHOUSE", "INBOUND"]);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const lot = await createLot({
    productId:      parsed.data.product_id,
    manufacturedAt: parsed.data.manufactured_at ? new Date(parsed.data.manufactured_at) : null,
    expiresAt:      parsed.data.expires_at      ? new Date(parsed.data.expires_at)      : null,
  });
  return NextResponse.json(lot, { status: 201 });
}
