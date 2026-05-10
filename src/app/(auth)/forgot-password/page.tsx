"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <p className="text-3xl font-extrabold tracking-tight text-red-600">SUNFORD</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              ระบบจัดการคลังสินค้า
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 pb-6 space-y-3">
              <div className="flex justify-center text-4xl">✉️</div>
              <p className="font-semibold text-base">ตรวจสอบอีเมลของคุณ</p>
              <p className="text-sm text-muted-foreground">
                ส่งลิงก์รีเซ็ตรหัสผ่านไปที่{" "}
                <span className="text-foreground font-medium">{email}</span> แล้ว
              </p>
              <Link
                href="/login"
                className="block pt-2 text-sm text-red-500 hover:underline"
              >
                กลับไปหน้า Login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            <CardTitle className="text-xl">ลืมรหัสผ่าน?</CardTitle>
            <CardDescription>
              กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
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
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? "กำลังส่ง…" : "ส่งลิงก์รีเซ็ต"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-red-500 hover:underline">
                กลับไปหน้า Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
