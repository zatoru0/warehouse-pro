import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error, user: currentUser } = await requireRole(req, ["SUPERADMIN", "ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id:          true,
      email:       true,
      full_name:   true,
      role:        true,
      departments: true,
      is_active:   true,
      created_at:  true,
    },
  });

  return NextResponse.json({ users, currentRole: currentUser!.role });
}
