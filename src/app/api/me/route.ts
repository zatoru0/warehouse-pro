import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  return NextResponse.json({
    id:          user!.id,
    email:       user!.email,
    full_name:   user!.full_name,
    role:        user!.role,
    departments: user!.departments,
    is_active:   user!.is_active,
  });
}
