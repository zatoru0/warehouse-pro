import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { email, password, full_name } = await req.json();

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  // สมัครเองได้เฉพาะ "ผู้ใช้คนแรก" (bootstrap = SUPERADMIN) เท่านั้น
  // หลังจากนั้นปิด — ให้ผู้ดูแลระบบสร้างบัญชีผ่านหน้าจัดการผู้ใช้
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return NextResponse.json(
      { error: "ปิดรับสมัครด้วยตนเองแล้ว — กรุณาให้ผู้ดูแลระบบสร้างบัญชีให้" },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "สมัครไม่สำเร็จ" }, { status: 400 });
  }

  // สร้าง app user — ถ้าล้ม ต้อง rollback Supabase กัน orphan
  try {
    await prisma.user.create({
      data: {
        supabase_id: data.user.id,
        email:       data.user.email!,
        full_name,
        role:        "SUPERADMIN", // คนแรกของระบบ
      },
    });
  } catch {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    return NextResponse.json({ error: "สมัครไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
