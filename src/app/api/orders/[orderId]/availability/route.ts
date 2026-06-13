import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { getOrderAvailability } from "@/services/order.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { error } = await requireDepartment(req, ["ADMIN_DEPT"]);
  if (error) return error;
  const { orderId } = await params;

  try {
    const rows = await getOrderAvailability(orderId);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
