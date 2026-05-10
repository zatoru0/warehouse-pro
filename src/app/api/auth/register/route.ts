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

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // ผู้ใช้คนแรกของระบบ → SUPERADMIN อัตโนมัติ
  const userCount = await prisma.user.count();
  await prisma.user.create({
    data: {
      supabase_id: data.user.id,
      email: data.user.email!,
      full_name,
      role: userCount === 0 ? "SUPERADMIN" : "READONLY",
    },
  });

  return NextResponse.json({ ok: true });
}
