import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { z } from "zod";
import { addBomLine, removeBomLine } from "@/services/production-bom.service";

const addSchema = z.object({
  material_product_id: z.string().min(1),
  qty_required:        z.number().positive(),
  notes:               z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireDepartment(req, ["PRODUCTION"]);
  if (error) return error;
  const { jobId } = await params;

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const line = await addBomLine({
      jobId,
      materialProductId: parsed.data.material_product_id,
      qtyRequired:       parsed.data.qty_required,
      notes:             parsed.data.notes,
    });
    return NextResponse.json(line, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { formErrors: [err instanceof Error ? err.message : "เกิดข้อผิดพลาด"] } },
      { status: 422 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireDepartment(req, ["PRODUCTION"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("lineId");
  if (!lineId) return NextResponse.json({ error: "ต้องระบุ lineId" }, { status: 422 });

  try {
    await removeBomLine(lineId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ลบไม่สำเร็จ" },
      { status: 422 }
    );
  }
}
