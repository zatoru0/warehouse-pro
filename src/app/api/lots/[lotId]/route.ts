import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LotStatus } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  manufactured_at: z.string().optional().nullable(),
  expires_at:      z.string().optional().nullable(),
  status:          z.nativeEnum(LotStatus).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { lotId } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      product: { select: { name: true, name_th: true, sku: true, unit: true } },
      stock_items: {
        select: {
          qty_on_hand: true,
          bin: {
            select: {
              code: true,
              warehouse: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!lot) return NextResponse.json({ error: "ไม่พบ Lot" }, { status: 404 });
  return NextResponse.json(lot);
}

// แก้ไข lot: วันผลิต / วันหมดอายุ / สถานะ (lot_number + barcode แก้ไม่ได้ — พิมพ์แปะของจริงไปแล้ว)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const { error } = await requireDepartment(req, ["WAREHOUSE", "INBOUND"]);
  if (error) return error;

  const { lotId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.manufactured_at !== undefined)
    data.manufactured_at = parsed.data.manufactured_at ? new Date(parsed.data.manufactured_at) : null;
  if (parsed.data.expires_at !== undefined)
    data.expires_at = parsed.data.expires_at ? new Date(parsed.data.expires_at) : null;

  const lot = await prisma.lot.update({ where: { id: lotId }, data });
  return NextResponse.json(lot);
}

// ลบ lot ได้เฉพาะ lot เปล่า (ไม่มี stock / movement / รับเข้า / งานผลิต) — ป้องกัน audit trail พัง
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const { error } = await requireDepartment(req, ["WAREHOUSE", "INBOUND"]);
  if (error) return error;

  const { lotId } = await params;

  const lot = await prisma.lot.findUnique({
    where:  { id: lotId },
    select: {
      _count: {
        select: {
          stock_items:     true,
          movements:       true,
          receiving_lines: true,
          production_jobs: true,
        },
      },
    },
  });
  if (!lot) return NextResponse.json({ error: "ไม่พบ Lot" }, { status: 404 });

  const { stock_items, movements, receiving_lines, production_jobs } = lot._count;
  if (stock_items + movements + receiving_lines + production_jobs > 0) {
    return NextResponse.json(
      { error: "ลบไม่ได้: Lot นี้มีการใช้งานแล้ว (สต็อก/ประวัติ) — ใช้เปลี่ยนสถานะเป็น กักกัน/หมดอายุ/ใช้หมด แทน" },
      { status: 409 }
    );
  }

  await prisma.lot.delete({ where: { id: lotId } });
  return NextResponse.json({ ok: true });
}
