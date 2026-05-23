import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceTicketUpdateSchema } from "@/lib/validators/service-ticket.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { ticketId } = await params;

  const ticket = await prisma.serviceTicket.findUnique({
    where: { id: ticketId },
    include: {
      customer: true,
      product:  true,
      order:    { select: { id: true, order_number: true } },
      receiver: { select: { full_name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { error } = await requireDepartment(req, ["AFTER_SALES"]);
  if (error) return error;
  const { ticketId } = await params;

  const body = await req.json();
  const parsed = serviceTicketUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "CLOSED") data.closed_at = new Date();

  const ticket = await prisma.serviceTicket.update({ where: { id: ticketId }, data });
  return NextResponse.json(ticket);
}
