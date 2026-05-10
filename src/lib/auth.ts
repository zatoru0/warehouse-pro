import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { supabase_id: session.user.id },
  });
}

export async function requireAuth(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  let user = await prisma.user.findUnique({ where: { supabase_id: session.user.id } });

  if (!user) {
    try {
      // email already in DB (e.g. supabase_id changed) → re-link
      const byEmail = await prisma.user.findUnique({ where: { email: session.user.email! } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data:  { supabase_id: session.user.id },
        });
      } else {
        const count = await prisma.user.count();
        user = await prisma.user.create({
          data: {
            supabase_id: session.user.id,
            email:       session.user.email!,
            full_name:   (session.user.user_metadata?.full_name as string) || session.user.email!.split("@")[0],
            role:        count === 0 ? "SUPERADMIN" : "READONLY",
          },
        });
      }
    } catch {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
    }
  }

  if (!user.is_active) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export async function requireRole(req: NextRequest, roles: UserRole[]) {
  const { error, user } = await requireAuth(req);
  if (error) return { error, user: null };
  if (!roles.includes(user!.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}
