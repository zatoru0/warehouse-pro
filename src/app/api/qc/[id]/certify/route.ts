import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  passed: z.boolean(),
  notes:  z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(req);
  if (error) return error;
  const { id } = await params;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const record = await prisma.qcRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "ไม่พบรายการ QC" }, { status: 404 });
  if (record.result !== "PASS") return NextResponse.json({ error: "ต้องผ่าน QC ก่อนตีตรา" }, { status: 400 });
  if (record.is_certified) return NextResponse.json({ error: "ตีตราแล้ว" }, { status: 400 });

  const updated = await prisma.qcRecord.update({
    where: { id },
    data: {
      is_certified:  true,
      certified_at:  new Date(),
      certified_by:  user!.id,
      certify_notes: parsed.data.notes,
    },
  });

  return NextResponse.json(updated);
}
