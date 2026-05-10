import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  code:    z.string().min(1).optional(),
  name:    z.string().min(1).optional(),
  name_th: z.string().optional().nullable(),
  phone:   z.string().optional().nullable(),
  email:   z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  line_id: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  return NextResponse.json(customer);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  await prisma.customer.update({ where: { id }, data: { is_active: false } });
  return NextResponse.json({ ok: true });
}
