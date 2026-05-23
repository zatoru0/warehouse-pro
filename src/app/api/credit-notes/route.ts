import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditNoteSchema } from "@/lib/validators/credit-note.schema";
import { nextCreditNoteNumber } from "@/services/numbering.service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const cns = await prisma.creditNote.findMany({
    where: { ...(status && { status: status as never }) },
    include: {
      customer: { select: { name: true, code: true } },
      order:    { select: { id: true, order_number: true } },
      issuer:   { select: { full_name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json(cns);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireDepartment(req, ["AFTER_SALES", "ADMIN_DEPT"]);
  if (error) return error;

  const body = await req.json();
  const parsed = creditNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const cn_number = await nextCreditNoteNumber();
  const total_amount = parsed.data.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);

  const cn = await prisma.creditNote.create({
    data: {
      cn_number,
      customer_id:  parsed.data.customer_id,
      order_id:     parsed.data.order_id,
      reason:       parsed.data.reason,
      notes:        parsed.data.notes,
      total_amount,
      issued_by:    user!.id,
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

  return NextResponse.json(cn, { status: 201 });
}
