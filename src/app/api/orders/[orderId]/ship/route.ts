import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { shipOrder } from "@/services/order.service";
import { z } from "zod";

const schema = z.object({
  carrier_name:    z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { orderId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const order = await shipOrder({
      orderId,
      carrierName:    parsed.data.carrier_name,
      trackingNumber: parsed.data.tracking_number,
    });
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
