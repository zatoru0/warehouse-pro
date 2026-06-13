import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { createProductionForOrder } from "@/services/order.service";
import { z } from "zod";

const schema = z.object({
  items: z.array(z.object({
    product_id: z.string().min(1),
    qty:        z.number().positive(),
  })).min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error, user } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;
  const { orderId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const jobs = await createProductionForOrder({
      orderId,
      performedBy: user!.id,
      items:       parsed.data.items.map((i) => ({ productId: i.product_id, qty: i.qty })),
    });
    return NextResponse.json({ created: jobs.length, jobs }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
