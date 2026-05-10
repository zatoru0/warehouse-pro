import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole, Department } from "@prisma/client";

const updateSchema = z.object({
  role:        z.nativeEnum(UserRole).optional(),
  is_active:   z.boolean().optional(),
  departments: z.array(z.nativeEnum(Department)).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error, user: currentUser } = await requireRole(req, ["SUPERADMIN", "ADMIN"]);
  if (error) return error;

  const { userId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Only SUPERADMIN can change roles
  if (parsed.data.role !== undefined && currentUser!.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "เฉพาะ Super Admin เท่านั้นที่เปลี่ยน role ได้" }, { status: 403 });
  }

  // Prevent changing a SUPERADMIN's role or status
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (target.role === "SUPERADMIN") {
    return NextResponse.json({ error: "ไม่สามารถแก้ไข Super Admin ได้" }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data:  parsed.data,
  });

  return NextResponse.json(user);
}
