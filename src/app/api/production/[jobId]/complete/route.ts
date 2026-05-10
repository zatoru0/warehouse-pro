import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { completeJob } from "@/services/production.service";
import { z } from "zod";

const schema = z.object({
  qty_produced: z.number().min(0),
  send_to_qc:   z.boolean().default(true),
  notes:        z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error, user } = await requireAuth(req);
  if (error) return error;
  const { jobId } = await params;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const job = await completeJob({
      jobId,
      qtyProduced: parsed.data.qty_produced,
      sendToQc:    parsed.data.send_to_qc,
      performedBy: user!.id,
      notes:       parsed.data.notes,
    });
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
