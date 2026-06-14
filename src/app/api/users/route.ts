import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole, Department } from "@prisma/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { error, user: currentUser } = await requireRole(req, ["SUPERADMIN", "ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id:          true,
      email:       true,
      full_name:   true,
      role:        true,
      departments: true,
      is_active:   true,
      created_at:  true,
    },
  });

  return NextResponse.json({ users, currentRole: currentUser!.role });
}

const createSchema = z.object({
  email:       z.string().email("อีเมลไม่ถูกต้อง"),
  password:    z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  full_name:   z.string().trim().min(1, "ต้องระบุชื่อ-นามสกุล"),
  role:        z.nativeEnum(UserRole),
  departments: z.array(z.nativeEnum(Department)).default([]),
});

export async function POST(req: NextRequest) {
  const { error, user: currentUser } = await requireRole(req, ["SUPERADMIN", "ADMIN"]);
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { email, password, full_name, role, departments } = parsed.data;

  // เฉพาะ SUPERADMIN เท่านั้นที่สร้างบัญชีระดับ ADMIN / SUPERADMIN ได้
  if ((role === "SUPERADMIN" || role === "ADMIN") && currentUser!.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "เฉพาะ Super Admin เท่านั้นที่สร้างผู้ใช้ระดับ Admin ได้" },
      { status: 403 }
    );
  }

  // 1) สร้าง auth user ใน Supabase (auto-confirm)
  const { data, error: sErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });
  if (sErr || !data.user) {
    const msg = sErr?.message ?? "";
    const friendly = /already|registered|exist/i.test(msg)
      ? "อีเมลนี้มีในระบบแล้ว"
      : msg || "สร้างบัญชีไม่สำเร็จ";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  // 2) สร้าง app user ใน Prisma — ถ้าล้ม ต้อง rollback Supabase กัน orphan
  try {
    const created = await prisma.user.create({
      data: {
        supabase_id: data.user.id,
        email:       data.user.email!,
        full_name,
        role,
        departments,
      },
      select: {
        id: true, email: true, full_name: true, role: true,
        departments: true, is_active: true, created_at: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    // rollback: ลบ Supabase user ที่เพิ่งสร้าง เพื่อไม่ให้เกิด orphan
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    const msg = e instanceof Error ? e.message : "";
    const friendly = /unique|exist/i.test(msg)
      ? "อีเมลนี้มีในระบบแล้ว"
      : "บันทึกผู้ใช้ไม่สำเร็จ กรุณาลองใหม่";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }
}
