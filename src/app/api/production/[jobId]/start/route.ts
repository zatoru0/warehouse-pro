import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { startJob } from "@/services/production.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { error } = await requireDepartment(req, ["PRODUCTION"]);
  if (error) return error;
  const { jobId } = await params;

  try {
    const job = await startJob(jobId);
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
