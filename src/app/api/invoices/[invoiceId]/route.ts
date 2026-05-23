import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceUpdateSchema } from "@/lib/validators/invoice.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      issuer:   { select: { full_name: true } },
      lines:    { include: { product: { select: { sku: true, name: true } } } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { error } = await requireDepartment(req, ["AFTER_SALES", "ADMIN_DEPT"]);
  if (error) return error;
  const { invoiceId } = await params;

  const body = await req.json();
  const parsed = invoiceUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "ISSUED") data.issued_at = new Date();
  if (parsed.data.status === "PAID")   data.paid_at   = new Date();

  const invoice = await prisma.invoice.update({ where: { id: invoiceId }, data });
  return NextResponse.json(invoice);
}
