import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { receivingLineSchema } from "@/lib/validators/receiving.schema";
import { addLine, updateLine } from "@/services/receiving.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireDepartment(req, ["INBOUND"]);
  if (error) return error;
  const { jobId } = await params;

  const body   = await req.json();
  const parsed = receivingLineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const line = await addLine({
    jobId,
    productId:   parsed.data.product_id,
    expectedQty: parsed.data.expected_qty,
    notes:       parsed.data.notes,
  });
  return NextResponse.json(line, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireDepartment(req, ["INBOUND"]);
  if (error) return error;

  const body = await req.json();
  const { lineId, received_qty, bin_id, lot_id } = body;
  if (!lineId) return NextResponse.json({ error: "ต้องระบุ lineId" }, { status: 422 });

  const line = await updateLine({
    lineId,
    receivedQty: received_qty,
    binId:       bin_id,
    lotId:       lot_id,
  });
  return NextResponse.json(line);
}
