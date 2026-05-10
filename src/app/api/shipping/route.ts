import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextShipmentNumber } from "@/services/numbering.service";
import { z } from "zod";

const shipmentSchema = z.object({
  order_id:        z.string().min(1),
  carrier_name:    z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const shipments = await prisma.shipment.findMany({
    include: {
      order: { select: { order_number: true, channel: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = shipmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const shipment_number = await nextShipmentNumber();
  const shipment = await prisma.shipment.create({
    data: { ...parsed.data, shipment_number },
  });

  return NextResponse.json(shipment, { status: 201 });
}
