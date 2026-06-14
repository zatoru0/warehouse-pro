"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setLoading(true);

    // สร้าง user ผ่าน admin API (auto-confirm ไม่ต้องยืนยันอีเมล)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    // เข้าสู่ระบบทันทีหลังสมัคร
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl font-extrabold tracking-tight text-red-600">SUNFORD</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            ระบบจัดการคลังสินค้า
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">ตั้งค่าผู้ดูแลระบบ</CardTitle>
            <CardDescription>
              สำหรับสร้างบัญชีผู้ดูแลคนแรกของระบบเท่านั้น — บัญชีพนักงานอื่นๆ ให้ผู้ดูแลสร้างผ่านหน้า &quot;จัดการผู้ใช้&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="สมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <PasswordInput
                  id="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
                <PasswordInput
                  id="confirm"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? "กำลังสมัคร…" : "สมัครใช้งาน"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-red-500 hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
