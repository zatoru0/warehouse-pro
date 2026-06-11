import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { confirmOrder } from "@/services/order.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;
  const { orderId } = await params;

  try {
    return NextResponse.json(await confirmOrder(orderId));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
