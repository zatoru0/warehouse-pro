import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { pickOrder } from "@/services/order.service";
import { z } from "zod";

const schema = z.object({
  picks: z.array(z.object({
    lineId: z.string().min(1),
    binId:  z.string().min(1),
    lotId:  z.string().min(1),
    qty:    z.number().positive(),
  })).min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error, user } = await requireAuth(req);
  if (error) return error;
  const { orderId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const order = await pickOrder({
      orderId,
      performedBy: user!.id,
      picks:       parsed.data.picks,
    });
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
