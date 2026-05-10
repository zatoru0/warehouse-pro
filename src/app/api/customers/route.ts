import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  name_th: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  line_id: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const customers = await prisma.customer.findMany({
    where: {
      is_active: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    take: 50,
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const customer = await prisma.customer.create({ data: parsed.data });
    return NextResponse.json(customer, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: "รหัสลูกค้านี้มีอยู่แล้ว" }, { status: 409 });
    }
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
