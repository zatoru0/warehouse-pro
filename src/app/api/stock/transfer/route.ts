import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { writeMovement } from "@/services/stock.service";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  lotId:     z.string(),
  fromBinId: z.string(),
  toBinId:   z.string(),
  qty:       z.number().positive(),
  notes:     z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { productId, lotId, fromBinId, toBinId, qty, notes } = parsed.data;

  if (fromBinId === toBinId) {
    return NextResponse.json({ error: "ต้นทางและปลายทางต้องต่างกัน" }, { status: 422 });
  }

  await writeMovement({
    productId,
    lotId,
    fromBinId,
    toBinId,
    type:        "TRANSFER",
    qty,
    performedBy: user!.id,
    notes,
  });

  return NextResponse.json({ ok: true });
}
