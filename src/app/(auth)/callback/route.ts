import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.session) {
      const { user } = data.session;

      if (type !== "recovery") {
        const existing = await prisma.user.findUnique({
          where: { supabase_id: user.id },
        });
        if (!existing) {
          const fullName =
            (user.user_metadata?.full_name as string) ||
            user.email?.split("@")[0] ||
            "User";
          await prisma.user.create({
            data: {
              supabase_id: user.id,
              email: user.email!,
              full_name: fullName,
            },
          });
        }
      }
    }
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
