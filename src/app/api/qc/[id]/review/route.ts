import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { reviewRecord } from "@/services/qc.service";
import { z } from "zod";

const schema = z.object({
  result:      z.enum(["PASS", "FAIL"]),
  qty_passed:  z.number().min(0),
  qty_failed:  z.number().min(0),
  notes:       z.string().optional(),
  isDefective: z.boolean().optional(), // ✨ เพิ่มบรรทัดนี้ให้ Zod รู้จักค่าจากหน้าเว็บ
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireDepartment(req, ["QC"]);
  if (error) return error;
  const { id } = await params;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const record = await reviewRecord({
      recordId:    id,
      result:      parsed.data.result,
      qtyPassed:   parsed.data.qty_passed,
      qtyFailed:   parsed.data.qty_failed,
      inspectedBy: user!.id,
      notes:       parsed.data.notes,
      isDefective: parsed.data.isDefective, // ✨ เพิ่มบรรทัดนี้เพื่อส่งค่าเข้าไปแยกสายใน Service
    });
    return NextResponse.json(record);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}