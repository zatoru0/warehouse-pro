import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const lineSchema = z.object({
  product_id: z.string().min(1),
  qty_ordered: z.number().positive(),
  unit_price:  z.number().min(0).default(0),
  notes:       z.string().optional().nullable(),
});

const createSchema = z.object({
  supplier_id:   z.string().min(1),
  expected_date: z.string().optional().nullable(),
  reference_doc: z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
  lines:         z.array(lineSchema).min(1, "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ"),
});

async function genPoNumber(): Promise<string> {
  const d = new Date();
  const prefix = `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const last = await prisma.purchaseOrder.findFirst({
    where:   { po_number: { startsWith: prefix } },
    orderBy: { po_number: "desc" },
  });
  const seq = last ? parseInt(last.po_number.slice(-4)) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await prisma.purchaseOrder.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      creator:  { select: { id: true, full_name: true } },
      _count:   { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { lines, expected_date, ...rest } = parsed.data;
  const po_number = await genPoNumber();

  const totalAmount = lines.reduce((s, l) => s + l.qty_ordered * l.unit_price, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      ...rest,
      po_number,
      created_by:    user!.id,
      expected_date: expected_date ? new Date(expected_date) : null,
      total_amount:  totalAmount,
      lines: {
        create: lines.map((l) => ({
          product_id:  l.product_id,
          qty_ordered: l.qty_ordered,
          unit_price:  l.unit_price,
          notes:       l.notes ?? null,
        })),
      },
    },
    include: { lines: true },
  });

  return NextResponse.json(po, { status: 201 });
}
