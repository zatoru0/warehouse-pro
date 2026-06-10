import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { orderLineSchema } from "@/lib/validators/order.schema";
import { addLine, removeLine } from "@/services/order.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;
  const { orderId } = await params;

  const body   = await req.json();
  const parsed = orderLineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const line = await addLine({
    orderId,
    productId: parsed.data.product_id,
    qty:       parsed.data.qty,
    unitPrice: parsed.data.unit_price,
    notes:     parsed.data.notes,
  });
  return NextResponse.json(line, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("lineId");
  if (!lineId) return NextResponse.json({ error: "ต้องระบุ lineId" }, { status: 422 });

  await removeLine(lineId);
  return NextResponse.json({ ok: true });
}
