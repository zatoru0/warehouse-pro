"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Shield } from "lucide-react";
import { ALL_DEPARTMENTS, DEPARTMENT_LABELS, DEPARTMENT_DESCRIPTIONS, DEPARTMENT_COLORS } from "@/lib/departments";
import type { Department } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN:      "แอดมิน",
  STAFF:      "พนักงาน",
  READONLY:   "ดูอย่างเดียว",
};

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-red-500/10 text-red-600",
  ADMIN:      "bg-blue-500/10 text-blue-600",
  STAFF:      "bg-green-500/10 text-green-600",
  READONLY:   "bg-muted text-muted-foreground",
};

const ASSIGNABLE_ROLES = (["ADMIN", "STAFF", "READONLY"] as const);

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  departments: Department[];
  is_active: boolean;
  created_at: string;
};

type ApiResponse = { users: User[]; currentRole: string } | { error: string };

export default function UsersPage() {
  const { data, mutate, isLoading } = useSWR<ApiResponse>("/api/users", fetcher);

  const users: User[]        = (data && "users" in data) ? data.users : [];
  const currentRole: string  = (data && "currentRole" in data) ? data.currentRole : "";
  const apiError: string | null = (data && "error" in data) ? data.error : null;

  const isSuperAdmin = currentRole === "SUPERADMIN";

  const [saving, setSaving] = useState<string | null>(null);
  const [error,  setError]  = useState("");

  async function updateRole(userId: string, role: string) {
    setSaving(userId); setError("");
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "เกิดข้อผิดพลาด");
    await mutate();
    setSaving(null);
  }

  async function toggleActive(userId: string, current: boolean) {
    setSaving(userId); setError("");
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "เกิดข้อผิดพลาด");
    await mutate();
    setSaving(null);
  }

  async function toggleDepartment(userId: string, dept: Department, current: Department[]) {
    setSaving(userId); setError("");
    const next = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept];
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departments: next }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "เกิดข้อผิดพลาด");
    await mutate();
    setSaving(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">จัดการผู้ใช้</h2>
        {isSuperAdmin && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
            <Shield className="h-3.5 w-3.5" />
            Super Admin — เปลี่ยน role + ฝ่ายได้
          </span>
        )}
      </div>

      {apiError && (
        <Card>
          <CardContent className="py-6 text-center text-sm">
            <p className="font-semibold text-destructive">ไม่มีสิทธิ์เข้าถึง</p>
            <p className="mt-1 text-muted-foreground">เฉพาะ Super Admin หรือ Admin เท่านั้นที่จัดการผู้ใช้ได้</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card>
        {isLoading ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด…</CardContent>
        ) : (
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">อีเมล</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สิทธิ์</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ฝ่าย</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่สมัคร</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const adminLike = u.role === "SUPERADMIN" || u.role === "ADMIN";
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 align-top">
                      <td className="px-4 py-3 font-medium">{u.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {u.role === "SUPERADMIN" ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS.SUPERADMIN}`}>
                            Super Admin
                          </span>
                        ) : isSuperAdmin ? (
                          <select
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-600 disabled:opacity-50"
                            value={u.role}
                            disabled={saving === u.id}
                            onChange={(e) => updateRole(u.id, e.target.value)}
                          >
                            {ASSIGNABLE_ROLES.map((val) => (
                              <option key={val} value={val}>{ROLE_LABELS[val]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role] ?? "bg-muted"}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        )}
                      </td>

                      {/* Departments — inline toggle pills */}
                      <td className="px-4 py-3 min-w-[280px]">
                        {adminLike ? (
                          <span className="text-xs text-muted-foreground italic">เห็นทุกฝ่าย</span>
                        ) : isSuperAdmin ? (
                          <div className="flex flex-wrap gap-1">
                            {ALL_DEPARTMENTS.map((d) => {
                              const active = u.departments.includes(d);
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => toggleDepartment(u.id, d, u.departments)}
                                  disabled={saving === u.id}
                                  title={DEPARTMENT_DESCRIPTIONS[d]}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all disabled:opacity-50 ${
                                    active
                                      ? DEPARTMENT_COLORS[d]
                                      : "border-dashed border-border text-muted-foreground hover:border-solid hover:bg-muted/50"
                                  }`}
                                >
                                  {active ? "✓ " : "+ "}{DEPARTMENT_LABELS[d]}
                                </button>
                              );
                            })}
                            {u.departments.length === 0 && (
                              <p className="w-full text-[10px] text-amber-600 mt-0.5">⚠ ยังไม่ได้กำหนดฝ่าย — ผู้ใช้จะไม่เห็นเมนูใดๆ</p>
                            )}
                          </div>
                        ) : (
                          /* ADMIN viewer (not SUPERADMIN) — read-only badges */
                          <div className="flex flex-wrap gap-1">
                            {u.departments.length === 0 ? (
                              <span className="text-xs text-amber-600">ยังไม่กำหนด</span>
                            ) : u.departments.map((d) => (
                              <span key={d} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DEPARTMENT_COLORS[d]}`}>
                                {DEPARTMENT_LABELS[d]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(u.created_at), "dd MMM yyyy")}
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        {u.role !== "SUPERADMIN" ? (
                          <button
                            onClick={() => toggleActive(u.id, u.is_active)}
                            disabled={saving === u.id}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              u.is_active
                                ? "bg-green-500/10 text-green-600 hover:bg-red-500/10 hover:text-red-600"
                                : "bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-600"
                            }`}
                          >
                            {saving === u.id ? "…" : u.is_active ? "ใช้งาน" : "ระงับ"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีผู้ใช้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      {/* Department reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">รายชื่อฝ่ายและหน้าที่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALL_DEPARTMENTS.map((d) => (
            <div key={d} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${DEPARTMENT_COLORS[d]}`}>
                {DEPARTMENT_LABELS[d]}
              </span>
              <span className="text-xs text-muted-foreground">{DEPARTMENT_DESCRIPTIONS[d]}</span>
            </div>
          ))}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
            💡 ผู้ใช้ใหม่จะไม่เห็นเมนูใดๆ จนกว่า Super Admin จะกำหนดฝ่ายให้ — Admin/Super Admin เห็นทุกฝ่ายอัตโนมัติ
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
