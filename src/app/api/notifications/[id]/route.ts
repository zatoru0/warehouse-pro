import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visibleToUser } from "@/services/notification.service";
import { z } from "zod";

const patchSchema = z.object({
  is_read: z.boolean().optional(),
});

// mark อ่าน/ยังไม่อ่าน รายอัน (เฉพาะที่ user เห็นได้)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const res = await prisma.notification.updateMany({
    where: { AND: [{ id }, visibleToUser(user!)] },
    data:  { is_read: parsed.data.is_read ?? true },
  });
  if (res.count === 0) return NextResponse.json({ error: "ไม่พบการแจ้งเตือน" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// ลบรายอัน (เฉพาะที่ user เห็นได้)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const res = await prisma.notification.deleteMany({
    where: { AND: [{ id }, visibleToUser(user!)] },
  });
  if (res.count === 0) return NextResponse.json({ error: "ไม่พบการแจ้งเตือน" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
