import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, visibleToUser } from "@/services/notification.service";

async function maybeCreatePoDueNotifications() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  const overduePOs = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["SENT", "PARTIAL"] },
      expected_date: { lte: inThreeDays },
    },
    select: { id: true, po_number: true, expected_date: true },
  });

  for (const po of overduePOs) {
    if (!po.expected_date) continue;
    const exists = await prisma.notification.findFirst({
      where: { type: "PO_DUE", link: `/purchase-orders/${po.id}`, created_at: { gte: today } },
    });
    if (exists) continue;

    const isOverdue = po.expected_date < new Date();
    await createNotification({
      type:  "PO_DUE",
      title: `${isOverdue ? "เกินกำหนด" : "ใกล้ถึงกำหนด"}: ${po.po_number}`,
      body:  `กำหนดรับ ${po.expected_date.toLocaleDateString("th-TH")}`,
      link:  `/purchase-orders/${po.id}`,
    });
  }
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  await maybeCreatePoDueNotifications().catch(() => {});

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 30, 1), 100);

  const visibleFilter = visibleToUser(user!);

  const notifications = await prisma.notification.findMany({
    where: {
      AND: [
        visibleFilter,
        ...(unreadOnly ? [{ is_read: false }] : []),
      ],
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { AND: [visibleFilter, { is_read: false }] },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// mark ทั้งหมดที่ user เห็นได้ ว่าอ่านแล้ว
export async function PATCH(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  await prisma.notification.updateMany({
    where: { AND: [visibleToUser(user!), { is_read: false }] },
    data:  { is_read: true },
  });

  return NextResponse.json({ ok: true });
}
