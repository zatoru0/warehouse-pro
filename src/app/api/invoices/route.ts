import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validators/invoice.schema";
import { nextInvoiceNumber } from "@/services/numbering.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: { ...(status && { status: status as never }) },
    include: {
      customer: { select: { name: true, code: true } },
      issuer:   { select: { full_name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const invoice_number = await nextInvoiceNumber();
  const total_amount = parsed.data.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);

  const invoice = await prisma.invoice.create({
    data: {
      invoice_number,
      customer_id:        parsed.data.customer_id,
      service_ticket_id:  parsed.data.service_ticket_id,
      reason:             parsed.data.reason,
      notes:              parsed.data.notes,
      due_date:           parsed.data.due_date ? new Date(parsed.data.due_date) : null,
      total_amount,
      issued_by:          user!.id,
      lines: {
        create: parsed.data.lines.map((l) => ({
          product_id:  l.product_id,
          description: l.description,
          qty:         l.qty,
          unit_price:  l.unit_price,
          amount:      l.qty * l.unit_price,
        })),
      },
    },
    include: { lines: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
