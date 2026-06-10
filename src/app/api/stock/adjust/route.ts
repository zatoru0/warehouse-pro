import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { writeMovement } from "@/services/stock.service";
import { checkLowStock } from "@/services/notification.service";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  lotId: z.string(),
  binId: z.string(),
  qty: z.number().positive(),
  direction: z.enum(["IN", "OUT"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error, user } = await requireDepartment(req, ["WAREHOUSE"]);
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { productId, lotId, binId, qty, direction, notes } = parsed.data;

  await writeMovement({
    productId,
    lotId,
    toBinId:   direction === "IN"  ? binId : undefined,
    fromBinId: direction === "OUT" ? binId : undefined,
    type:      direction === "IN"  ? "ADJUST_IN" : "ADJUST_OUT",
    qty,
    performedBy: user!.id,
    notes,
  });

  if (direction === "OUT") {
    await checkLowStock(productId);
  }

  return NextResponse.json({ ok: true });
}
