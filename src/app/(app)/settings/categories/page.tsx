"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, X, Check } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category = {
  id: string;
  code: string;
  name: string;
  name_th: string | null;
  is_active: boolean;
};

type EditForm = { code: string; name: string; name_th: string };

const emptyEdit: EditForm = { code: "", name: "", name_th: "" };

export default function CategoriesPage() {
  const { data, mutate, isLoading } = useSWR("/api/categories", fetcher);
  const categories: Category[] = Array.isArray(data) ? data : [];

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(emptyEdit);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, name_th: addForm.name_th || null }),
    });
    if (!res.ok) {
      try {
        const d = await res.json();
        setAddError(d.error?.formErrors?.[0] ?? d.error ?? "เกิดข้อผิดพลาด");
      } catch {
        setAddError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } else {
      setAddForm(emptyEdit);
      setShowAdd(false);
      await mutate();
    }
    setAdding(false);
  }

  function startEdit(c: Category) {
    setEditId(c.id);
    setEditForm({ code: c.code, name: c.name, name_th: c.name_th ?? "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, name_th: editForm.name_th || null }),
    });
    setEditId(null);
    await mutate();
    setSaving(false);
  }

  async function disableCategory(id: string) {
    if (!confirm("ปิดใช้งานหมวดหมู่นี้?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← ตั้งค่า
        </Link>
        <h2 className="text-lg font-semibold">หมวดหมู่สินค้า</h2>
        <Button
          onClick={() => { setShowAdd((v) => !v); setAddError(""); }}
          className="ml-auto bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="grid grid-cols-3 gap-3">
              {addError && (
                <div className="col-span-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {addError}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">รหัส *</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="ELEC"
                  value={addForm.code}
                  onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ชื่อ (อังกฤษ) *</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Electronics"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ชื่อ (ไทย)</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="อิเล็กทรอนิกส์"
                  value={addForm.name_th}
                  onChange={(e) => setAddForm((f) => ({ ...f, name_th: e.target.value }))}
                />
              </div>
              <div className="col-span-3 flex gap-2 justify-end">
                <Button type="button" onClick={() => setShowAdd(false)} className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={adding} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold">
                  {adding ? "กำลังเพิ่ม…" : "เพิ่มหมวดหมู่"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด…</CardContent>
        ) : (
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัส</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ (EN)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ (TH)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) =>
                  editId === c.id ? (
                    <tr key={c.id} className="border-b border-border bg-muted/20">
                      <td className="px-4 py-2">
                        <Input
                          className="h-7 text-xs"
                          value={editForm.code}
                          onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-7 text-xs"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-7 text-xs"
                          value={editForm.name_th}
                          onChange={(e) => setEditForm((f) => ({ ...f, name_th: e.target.value }))}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(c.id)}
                            disabled={saving}
                            className="rounded p-1 text-green-600 hover:bg-green-500/10"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{c.code}</td>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.name_th ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(c)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => disableCategory(c.id)}
                            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                          >
                            ปิด
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      ยังไม่มีหมวดหมู่สินค้า
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
