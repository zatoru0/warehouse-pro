"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category  = { id: string; name: string };
type Warehouse = { id: string; name: string; code: string };
type Bin       = { id: string; code: string; warehouse: { id: string; name: string } };

const BEHAVIORS: { key: string; label: string }[] = [
  { key: "allow_sale",        label: "ขายได้" },
  { key: "allow_purchase",    label: "สั่งซื้อได้" },
  { key: "allow_repair",      label: "ซ่อมได้" },
  { key: "allow_claim",       label: "เคลมได้" },
  { key: "allow_qc",          label: "ต้องตรวจ QC" },
  { key: "allow_return",      label: "คืนสินค้าได้" },
  { key: "allow_assembly",    label: "ประกอบได้" },
  { key: "allow_disassembly", label: "แตกชิ้นส่วนได้" },
  { key: "allow_certify",     label: "ต้องตีตรา" },
];

const COMMON_UNITS = ["PCS", "ชิ้น", "BOX", "กล่อง", "SET", "ชุด", "PAIR", "คู่", "ROLL", "ม้วน", "KG", "G", "LITER", "M"];

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const router = useRouter();
  const { data: product, mutate, isLoading } = useSWR(`/api/products/${productId}`, fetcher);
  const { data: categoriesData } = useSWR("/api/categories", fetcher);
  const { data: warehousesData } = useSWR("/api/warehouses", fetcher);
  const { data: binsData }       = useSWR("/api/bins",       fetcher);
  const categories:  Category[]  = Array.isArray(categoriesData) ? categoriesData : [];
  const warehouses:  Warehouse[] = Array.isArray(warehousesData) ? warehousesData : [];
  const bins:        Bin[]       = Array.isArray(binsData)       ? binsData       : [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (product && !product.error) {
      setForm({
        sku: product.sku,
        name: product.name,
        name_th: product.name_th ?? "",
        barcode: product.barcode ?? "",
        category_id: product.category_id ?? "",
        unit: product.unit,
        description: product.description ?? "",
        cost_price: product.cost_price ?? "",
        sale_price: product.sale_price ?? "",
        min_stock_qty: product.min_stock_qty,
        reorder_qty: product.reorder_qty,
        image_url: product.image_url ?? "",
        default_warehouse_id: product.default_warehouse_id ?? "",
        default_bin_id:       product.default_bin_id       ?? "",
        display_order:        product.display_order       ?? 0,
        show_in_pos:          product.show_in_pos         ?? true,
        ...Object.fromEntries(BEHAVIORS.map((b) => [b.key, product[b.key]])),
      });
    }
  }, [product]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  }
  if (!product || product.error) {
    return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบสินค้า</div>;
  }

  function update(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      min_stock_qty: Number(form.min_stock_qty) || 0,
      reorder_qty: Number(form.reorder_qty) || 0,
      display_order: Number(form.display_order) || 0,
      name_th: form.name_th || null,
      barcode: form.barcode || null,
      category_id: form.category_id || null,
      description: form.description || null,
      image_url: form.image_url || null,
      default_warehouse_id: form.default_warehouse_id || null,
      default_bin_id:       form.default_bin_id       || null,
    };

    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error?.fieldErrors?.sku?.[0] ?? "เกิดข้อผิดพลาด");
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    await mutate();
  }

  async function softDelete() {
    if (!confirm("ปิดการใช้งานสินค้านี้?")) return;
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    router.push("/products");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/products")}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            ← กลับ
          </button>
          <div>
            <p className="text-lg font-semibold">{product.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                onClick={() => setEditing(false)}
                className="bg-muted hover:bg-muted/80 text-foreground"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {saving ? "กำลังบันทึก…" : "บันทึก"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={softDelete}
                className="bg-red-500/10 text-red-600 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                ปิดการใช้งาน
              </Button>
              <Button
                onClick={() => setEditing(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                แก้ไข
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ข้อมูลพื้นฐาน */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อมูลพื้นฐาน</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="SKU" editing={editing} value={form.sku} onChange={(v) => update("sku", v)} />
          <Field label="บาร์โค้ด" editing={editing} value={form.barcode} onChange={(v) => update("barcode", v)} />
          <Field label="ชื่อ (อังกฤษ)" editing={editing} value={form.name} onChange={(v) => update("name", v)} />
          <Field label="ชื่อ (ไทย)" editing={editing} value={form.name_th} onChange={(v) => update("name_th", v)} />
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">รายละเอียด</Label>
            {editing ? (
              <textarea
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            ) : (
              <p className="text-sm">{product.description ?? "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* หมวดหมู่ + หน่วย */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">หมวดหมู่ และหน่วย</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">หมวดหมู่</Label>
            {editing ? (
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.category_id}
                onChange={(e) => update("category_id", e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm">{product.category?.name ?? "—"}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">หน่วย</Label>
            {editing ? (
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm">{product.unit}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ราคา */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ราคา (บาท)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="ต้นทุน" editing={editing}
            value={form.cost_price} onChange={(v) => update("cost_price", v)}
            type="number"
            display={product.cost_price ? `฿${Number(product.cost_price).toLocaleString()}` : "—"}
          />
          <Field
            label="ราคาขาย" editing={editing}
            value={form.sale_price} onChange={(v) => update("sale_price", v)}
            type="number"
            display={product.sale_price ? `฿${Number(product.sale_price).toLocaleString()}` : "—"}
          />
        </CardContent>
      </Card>

      {/* พฤติกรรม */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">พฤติกรรมสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              {BEHAVIORS.map((b) => (
                <label
                  key={b.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    form[b.key]
                      ? "border-red-600/50 bg-red-600/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-red-600"
                    checked={!!form[b.key]}
                    onChange={(e) => update(b.key, e.target.checked)}
                  />
                  <span className="text-sm font-medium">{b.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {BEHAVIORS.filter((b) => product[b.key]).map((b) => (
                <Badge key={b.key} variant="secondary" className="text-xs">
                  {b.label}
                </Badge>
              ))}
              {BEHAVIORS.filter((b) => product[b.key]).length === 0 && (
                <p className="text-sm text-muted-foreground">ไม่ได้เปิดใช้งานพฤติกรรมใด</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* การควบคุมสต็อก */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">การควบคุมสต็อก</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="สต็อกขั้นต่ำ" editing={editing} value={form.min_stock_qty} onChange={(v) => update("min_stock_qty", v)} type="number" />
          <Field label="จำนวนสั่งซื้อ" editing={editing} value={form.reorder_qty} onChange={(v) => update("reorder_qty", v)} type="number" />
        </CardContent>
      </Card>

      {/* คลังเริ่มต้น */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">คลังเริ่มต้น</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">คลังเริ่มต้น</Label>
            {editing ? (
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.default_warehouse_id}
                onChange={(e) => { update("default_warehouse_id", e.target.value); update("default_bin_id", ""); }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            ) : (
              <p className="text-sm">{product.default_warehouse?.name ?? "—"}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bin เริ่มต้น</Label>
            {editing ? (
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 disabled:opacity-50"
                value={form.default_bin_id}
                onChange={(e) => update("default_bin_id", e.target.value)}
                disabled={!form.default_warehouse_id}
              >
                <option value="">-- ไม่ระบุ --</option>
                {bins.filter((b) => b.warehouse.id === form.default_warehouse_id).map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm">{product.default_bin?.code ?? "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* การแสดงผล */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">การแสดงผล</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="ลำดับการแสดง" editing={editing} value={form.display_order} onChange={(v) => update("display_order", v)} type="number" />
          <div className="space-y-1">
            <Label className="text-xs">แสดงในระบบขาย</Label>
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-red-600"
                  checked={!!form.show_in_pos}
                  onChange={(e) => update("show_in_pos", e.target.checked)}
                />
                แสดงใน POS / สั่งซื้อ
              </label>
            ) : (
              <p className="text-sm">{product.show_in_pos ? "แสดง" : "ซ่อน"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meta */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 text-xs text-muted-foreground">
          <div>
            <p>วันที่สร้าง</p>
            <p className="text-foreground">{format(new Date(product.created_at), "dd MMM yyyy HH:mm")}</p>
          </div>
          <div>
            <p>แก้ไขล่าสุด</p>
            <p className="text-foreground">{format(new Date(product.updated_at), "dd MMM yyyy HH:mm")}</p>
          </div>
          <div>
            <p>สถานะ</p>
            <p>
              {product.is_active ? (
                <span className="text-green-600">ใช้งาน</span>
              ) : (
                <span className="text-muted-foreground">ปิดการใช้งาน</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  editing,
  value,
  onChange,
  type = "text",
  display,
}: {
  label: string;
  editing: boolean;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  display?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {editing ? (
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          step={type === "number" ? "any" : undefined}
        />
      ) : (
        <p className="text-sm">{display ?? value ?? "—"}</p>
      )}
    </div>
  );
}
