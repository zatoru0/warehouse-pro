import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { user_id: user!.id },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { user_id: user!.id, is_read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}
