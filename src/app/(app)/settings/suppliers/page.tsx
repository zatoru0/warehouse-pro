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

type Supplier = {
  id: string;
  code: string;
  name: string;
  name_th: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  is_active: boolean;
};

type AddForm = {
  code: string; name: string; name_th: string;
  contact_name: string; phone: string; email: string; address: string; tax_id: string;
};

const emptyForm: AddForm = {
  code: "", name: "", name_th: "",
  contact_name: "", phone: "", email: "", address: "", tax_id: "",
};

function toPayload(f: AddForm) {
  return {
    code:         f.code,
    name:         f.name,
    name_th:      f.name_th || null,
    contact_name: f.contact_name || null,
    phone:        f.phone || null,
    email:        f.email || null,
    address:      f.address || null,
    tax_id:       f.tax_id || null,
  };
}

export default function SuppliersPage() {
  const { data, mutate, isLoading } = useSWR("/api/suppliers", fetcher);
  const suppliers: Supplier[] = Array.isArray(data) ? data : [];

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyForm);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(addForm)),
    });
    if (!res.ok) {
      try {
        const d = await res.json();
        setAddError(d.error?.formErrors?.[0] ?? d.error ?? "เกิดข้อผิดพลาด");
      } catch {
        setAddError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } else {
      setAddForm(emptyForm);
      setShowAdd(false);
      await mutate();
    }
    setAdding(false);
  }

  function startEdit(s: Supplier) {
    setEditId(s.id);
    setEditForm({
      code: s.code, name: s.name, name_th: s.name_th ?? "",
      contact_name: s.contact_name ?? "", phone: s.phone ?? "",
      email: s.email ?? "", address: s.address ?? "", tax_id: s.tax_id ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(editForm)),
    });
    setEditId(null);
    await mutate();
    setSaving(false);
  }

  async function disableSupplier(id: string) {
    if (!confirm("ปิดใช้งานผู้จัดหานี้?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← ตั้งค่า
        </Link>
        <h2 className="text-lg font-semibold">ผู้จัดหา (Supplier)</h2>
        <Button
          onClick={() => { setShowAdd((v) => !v); setAddError(""); }}
          className="ml-auto bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          เพิ่มผู้จัดหา
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="space-y-3">
              {addError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {addError}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">รหัส *</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="SUP-001"
                    value={addForm.code}
                    onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ชื่อบริษัท (EN) *</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Supplier Co., Ltd."
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ชื่อบริษัท (TH)</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="บริษัท ซัพพลายเออร์ จำกัด"
                    value={addForm.name_th}
                    onChange={(e) => setAddForm((f) => ({ ...f, name_th: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ผู้ติดต่อ</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="คุณ สมชาย"
                    value={addForm.contact_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">เบอร์โทร</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="02-xxx-xxxx"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">อีเมล</Label>
                  <Input
                    className="h-8 text-sm"
                    type="email"
                    placeholder="contact@supplier.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">เลขประจำตัวผู้เสียภาษี</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="0105560XXXXXX"
                    value={addForm.tax_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, tax_id: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">ที่อยู่</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="123 ถ.สุขุมวิท กรุงเทพฯ"
                    value={addForm.address}
                    onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" onClick={() => setShowAdd(false)} className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={adding} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold">
                  {adding ? "กำลังเพิ่ม…" : "เพิ่มผู้จัดหา"}
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อบริษัท</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้ติดต่อ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เบอร์โทร</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) =>
                  editId === s.id ? (
                    <tr key={s.id} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <Input className="h-7 text-xs" placeholder="รหัส" value={editForm.code}
                            onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                          <Input className="h-7 text-xs" placeholder="ชื่อ EN" value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                          <Input className="h-7 text-xs" placeholder="ชื่อ TH" value={editForm.name_th}
                            onChange={(e) => setEditForm((f) => ({ ...f, name_th: e.target.value }))} />
                          <Input className="h-7 text-xs" placeholder="ผู้ติดต่อ" value={editForm.contact_name}
                            onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))} />
                          <Input className="h-7 text-xs" placeholder="เบอร์โทร" value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                          <Input className="h-7 text-xs" type="email" placeholder="อีเมล" value={editForm.email}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                          <Input className="h-7 text-xs" placeholder="เลขภาษี" value={editForm.tax_id}
                            onChange={(e) => setEditForm((f) => ({ ...f, tax_id: e.target.value }))} />
                          <Input className="col-span-2 h-7 text-xs" placeholder="ที่อยู่" value={editForm.address}
                            onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => saveEdit(s.id)} disabled={saving}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-600 hover:bg-green-500/10">
                            <Check className="h-3 w-3" /> บันทึก
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
                            <X className="h-3 w-3" /> ยกเลิก
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{s.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        {s.name_th && <p className="text-xs text-muted-foreground">{s.name_th}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(s)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => disableSupplier(s.id)}
                            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10">
                            ปิด
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      ยังไม่มีผู้จัดหา
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
