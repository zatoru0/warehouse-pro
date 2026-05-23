import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  name_th: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const suppliers = await prisma.supplier.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireDepartment(req, ["WAREHOUSE", "ADMIN_DEPT"]);
  if (error) return error;

  const body = await req.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const supplier = await prisma.supplier.create({ data: parsed.data });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "database error";
    if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: "รหัสผู้จัดหานี้มีอยู่แล้ว" }, { status: 409 });
    }
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
