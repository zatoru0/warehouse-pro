import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceTicketSchema } from "@/lib/validators/service-ticket.schema";
import { nextServiceTicketNumber } from "@/services/numbering.service";
import { createNotification } from "@/services/notification.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tickets = await prisma.serviceTicket.findMany({
    where: { ...(status && { status: status as never }) },
    include: {
      customer: { select: { name: true, phone: true } },
      product:  { select: { name: true, sku: true } },
      receiver: { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = serviceTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const ticket_number = await nextServiceTicketNumber();
  const ticket = await prisma.serviceTicket.create({
    data: {
      ticket_number,
      ...parsed.data,
      received_by: user!.id,
    },
    include: { customer: true, product: true },
  });

  await createNotification({
    type:  "SERVICE_TICKET",
    title: `เคสใหม่: ${ticket_number}`,
    body:  `${ticket.customer?.name ?? "ลูกค้า"}: ${ticket.issue_desc.slice(0, 80)}`,
    link:  `/service-tickets/${ticket.id}`,
  });

  return NextResponse.json(ticket, { status: 201 });
}
