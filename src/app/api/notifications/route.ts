import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notification.service";

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

  const userDepartments = user!.departments;

  const broadcastFilter = {
    user_id: null,
    AND: [
      {
        OR: [
          { target_roles: { isEmpty: true } },
          { target_roles: { has: user!.role } },
        ],
      },
      {
        OR: [
          { target_departments: { isEmpty: true } },
          ...(userDepartments.length > 0
            ? [{ target_departments: { hasSome: userDepartments } }]
            : []),
        ],
      },
    ],
  };

  const visibleFilter = {
    OR: [
      { user_id: user!.id },
      broadcastFilter,
    ],
  };

  const notifications = await prisma.notification.findMany({
    where: {
      ...visibleFilter,
      ...(unreadOnly && { is_read: false }),
    },
    orderBy: { created_at: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      ...visibleFilter,
      is_read: false,
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const userDepartments = user!.departments;

  await prisma.notification.updateMany({
    where: {
      OR: [
        { user_id: user!.id },
        {
          user_id: null,
          AND: [
            {
              OR: [
                { target_roles: { isEmpty: true } },
                { target_roles: { has: user!.role } },
              ],
            },
            {
              OR: [
                { target_departments: { isEmpty: true } },
                ...(userDepartments.length > 0
                  ? [{ target_departments: { hasSome: userDepartments } }]
                  : []),
              ],
            },
          ],
        },
      ],
      is_read: false,
    },
    data: { is_read: true },
  });

  return NextResponse.json({ ok: true });
}
