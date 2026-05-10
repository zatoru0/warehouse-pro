import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product.schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category:          true,
      default_warehouse: { select: { id: true, name: true, code: true } },
      default_bin:       { select: { id: true, code: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { productId } = await params;

  const body = await req.json();
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const product = await prisma.product.update({ where: { id: productId }, data: parsed.data });
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const { productId } = await params;

  await prisma.product.update({ where: { id: productId }, data: { is_active: false } });
  return NextResponse.json({ ok: true });
}
