import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { z } from "zod";
import { issueBomLine } from "@/services/production-bom.service";

const issueSchema = z.object({
  line_id:     z.string().min(1),
  lot_id:      z.string().min(1),
  from_bin_id: z.string().min(1),
  qty:         z.number().positive(),
  notes:       z.string().optional(),
});

export async function POST(req: NextRequest) {
  // เบิกเพื่อผลิต — ตามผัง "พี่ยู(รับเข้า) เบิกจ่ายเพื่อผลิต" + ฝ่ายผลิตเบิกเองได้
  const { error, user } = await requireDepartment(req, ["PRODUCTION", "INBOUND"]);
  if (error) return error;

  const body = await req.json();
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const movement = await issueBomLine({
      lineId:      parsed.data.line_id,
      lotId:       parsed.data.lot_id,
      fromBinId:   parsed.data.from_bin_id,
      qty:         parsed.data.qty,
      performedBy: user!.id,
      notes:       parsed.data.notes,
    });
    return NextResponse.json(movement, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เบิกไม่สำเร็จ" },
      { status: 422 }
    );
  }
}
