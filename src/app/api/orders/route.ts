import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validators/order.schema";
import { nextOrderNumber } from "@/lib/number-generator";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");

  const orders = await prisma.order.findMany({
    where: {
      ...(channel && { channel: channel as any }),
      ...(status && { status: status as any }),
    },
    include: {
      customer: { select: { name: true } },
      handler: { select: { full_name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { ordered_at: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const order_number = await nextOrderNumber();
  const order = await prisma.order.create({
    data: { ...parsed.data, order_number, handled_by: user!.id },
  });

  return NextResponse.json(order, { status: 201 });
}
