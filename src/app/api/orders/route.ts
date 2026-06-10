import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validators/order.schema";
import { createOrder } from "@/services/order.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: { ...(status && { status: status as never }) },
    include: {
      customer: { select: { name: true } },
      handler:  { select: { full_name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { ordered_at: "desc" },
    take: 50,
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;

  const body   = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const order = await createOrder({
    channel:     parsed.data.channel,
    customerId:  parsed.data.customer_id,
    notes:       parsed.data.notes,
    totalAmount: parsed.data.total_amount,
    handledBy:   user!.id,
  });
  return NextResponse.json(order, { status: 201 });
}
