import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditNoteUpdateSchema } from "@/lib/validators/credit-note.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cnId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { cnId } = await params;

  const cn = await prisma.creditNote.findUnique({
    where: { id: cnId },
    include: {
      customer: true,
      order:    { select: { id: true, order_number: true } },
      issuer:   { select: { full_name: true } },
      lines:    { include: { product: { select: { sku: true, name: true } } } },
    },
  });
  if (!cn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cn);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cnId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { cnId } = await params;

  const body = await req.json();
  const parsed = creditNoteUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "ISSUED")   data.issued_at  = new Date();
  if (parsed.data.status === "REFUNDED") data.refunded_at = new Date();

  const cn = await prisma.creditNote.update({ where: { id: cnId }, data });
  return NextResponse.json(cn);
}
