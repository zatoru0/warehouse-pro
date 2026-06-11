import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { confirmJob } from "@/services/receiving.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error, user } = await requireDepartment(req, ["INBOUND"]);
  if (error) return error;
  const { jobId } = await params;

  try {
    const job = await confirmJob(jobId, user!.id);
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
