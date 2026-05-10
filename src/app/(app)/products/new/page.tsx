"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category  = { id: string; name: string; code: string };
type Warehouse = { id: string; name: string; code: string };
type Bin       = { id: string; code: string; warehouse: { id: string; name: string } };

const BEHAVIORS: { key: string; label: string; desc: string; default: boolean }[] = [
  { key: "allow_sale",        label: "ขายได้",         desc: "อนุญาตให้นำไปขาย",              default: true  },
  { key: "allow_purchase",    label: "สั่งซื้อได้",    desc: "อนุญาตให้สั่งซื้อจากผู้จัดหา",  default: true  },
  { key: "allow_repair",      label: "ซ่อมได้",        desc: "ส่งซ่อมที่ฝ่ายผลิต/ซ่อมบำรุง",  default: false },
  { key: "allow_claim",       label: "เคลมได้",        desc: "รับเคลมจากลูกค้า",               default: false },
  { key: "allow_qc",          label: "ต้องตรวจ QC",    desc: "บังคับผ่านการตรวจคุณภาพ",        default: true  },
  { key: "allow_return",      label: "คืนสินค้าได้",   desc: "อนุญาตให้ส่งคืนลูกค้า",          default: false },
  { key: "allow_assembly",    label: "ประกอบได้",       desc: "ใช้ในสายการผลิต/ประกอบ",          default: false },
  { key: "allow_disassembly", label: "แตกชิ้นส่วนได้", desc: "แยกชิ้นส่วนออกเป็นอะไหล่",       default: false },
  { key: "allow_certify",     label: "ต้องตีตรา",      desc: "ต้องผ่านการรับรอง/ตีตราก่อนขาย",  default: false },
];

const COMMON_UNITS = ["PCS", "ชิ้น", "BOX", "กล่อง", "SET", "ชุด", "PAIR", "คู่", "ROLL", "ม้วน", "KG", "G", "LITER", "M"];

export default function NewProductPage() {
  const router = useRouter();
  const { data: categoriesData } = useSWR("/api/categories", fetcher);
  const { data: warehousesData } = useSWR("/api/warehouses", fetcher);
  const { data: binsData }       = useSWR("/api/bins",       fetcher);
  const categories:  Category[]  = Array.isArray(categoriesData) ? categoriesData : [];
  const warehouses:  Warehouse[] = Array.isArray(warehousesData) ? warehousesData : [];
  const bins:        Bin[]       = Array.isArray(binsData)       ? binsData       : [];

  const [form, setForm] = useState({
    sku: "",
    name: "",
    name_th: "",
    barcode: "",
    category_id: "",
    unit: "PCS",
    description: "",
    cost_price: "",
    sale_price: "",
    min_stock_qty: "0",
    reorder_qty: "0",
    image_url: "",
    default_warehouse_id: "",
    default_bin_id:       "",
    display_order:        "0",
    show_in_pos:          true,
  });
  const [behaviors, setBehaviors] = useState<Record<string, boolean>>(
    Object.fromEntries(BEHAVIORS.map((b) => [b.key, b.default]))
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const filteredBins = form.default_warehouse_id
    ? bins.filter((b) => b.warehouse.id === form.default_warehouse_id)
    : [];

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      sku: form.sku,
      name: form.name,
      name_th: form.name_th || null,
      barcode: form.barcode || null,
      category_id: form.category_id || null,
      unit: form.unit || "PCS",
      description: form.description || null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      min_stock_qty: Number(form.min_stock_qty) || 0,
      reorder_qty: Number(form.reorder_qty) || 0,
      image_url: form.image_url || null,
      default_warehouse_id: form.default_warehouse_id || null,
      default_bin_id:       form.default_bin_id       || null,
      display_order:        Number(form.display_order) || 0,
      show_in_pos:          form.show_in_pos,
      ...behaviors,
    };

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(
        data.error?.fieldErrors?.sku?.[0] ??
        data.error?.formErrors?.[0] ??
        "เกิดข้อผิดพลาด"
      );
      setSubmitting(false);
      return;
    }

    router.push(`/products/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">เพิ่มสินค้าใหม่</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 1. ข้อมูลพื้นฐาน */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">1. ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU / รหัสสินค้า *</Label>
              <Input
                id="sku"
                placeholder="PRD-001"
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">บาร์โค้ด</Label>
              <Input
                id="barcode"
                placeholder="8851234567890"
                value={form.barcode}
                onChange={(e) => update("barcode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อสินค้า (อังกฤษ) *</Label>
              <Input
                id="name"
                placeholder="Industrial Sewing Machine"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_th">ชื่อสินค้า (ไทย)</Label>
              <Input
                id="name_th"
                placeholder="จักรเย็บผ้าอุตสาหกรรม"
                value={form.name_th}
                onChange={(e) => update("name_th", e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">รายละเอียด</Label>
              <textarea
                id="description"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. หมวดหมู่ + หน่วย */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">2. หมวดหมู่ และหน่วย</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">หมวดหมู่</Label>
              <select
                id="category"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.category_id}
                onChange={(e) => update("category_id", e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">หน่วยสินค้า *</Label>
              <select
                id="unit"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 3. ราคา */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">3. ราคา (บาท)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">ต้นทุน</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.cost_price}
                onChange={(e) => update("cost_price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">ราคาขาย</Label>
              <Input
                id="sale"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.sale_price}
                onChange={(e) => update("sale_price", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. พฤติกรรม */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">4. พฤติกรรมสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {BEHAVIORS.map((b) => (
                <label
                  key={b.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    behaviors[b.key]
                      ? "border-red-600/50 bg-red-600/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded accent-red-600"
                    checked={behaviors[b.key]}
                    onChange={(e) =>
                      setBehaviors((prev) => ({ ...prev, [b.key]: e.target.checked }))
                    }
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5. การควบคุมสต็อก */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">5. การควบคุมสต็อก</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min">สต็อกขั้นต่ำ (Min)</Label>
              <Input
                id="min"
                type="number"
                min="0"
                placeholder="0"
                value={form.min_stock_qty}
                onChange={(e) => update("min_stock_qty", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">แจ้งเตือนเมื่อต่ำกว่าจำนวนนี้</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder">จำนวนสั่งซื้อ (Reorder)</Label>
              <Input
                id="reorder"
                type="number"
                min="0"
                placeholder="0"
                value={form.reorder_qty}
                onChange={(e) => update("reorder_qty", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">จำนวนที่ควรสั่งเมื่อ stock ต่ำ</p>
            </div>
          </CardContent>
        </Card>

        {/* 6. คลังเริ่มต้น */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">6. คลังเริ่มต้น</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-wh">คลังเริ่มต้น</Label>
              <select
                id="default-wh"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={form.default_warehouse_id}
                onChange={(e) => { update("default_warehouse_id", e.target.value); update("default_bin_id", ""); }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">คลังที่จะใช้รับเข้าโดยอัตโนมัติ</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-bin">ตำแหน่งเริ่มต้น (Bin)</Label>
              <select
                id="default-bin"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 disabled:opacity-50"
                value={form.default_bin_id}
                onChange={(e) => update("default_bin_id", e.target.value)}
                disabled={!form.default_warehouse_id}
              >
                <option value="">-- ไม่ระบุ --</option>
                {filteredBins.map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">เลือกคลังก่อนถึงจะเลือก Bin ได้</p>
            </div>
          </CardContent>
        </Card>

        {/* 7. การแสดงผล */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">7. การแสดงผล</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order">ลำดับการแสดง</Label>
              <Input
                id="order"
                type="number"
                min="0"
                placeholder="0"
                value={form.display_order}
                onChange={(e) => update("display_order", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">ค่าน้อยจะมาก่อน</p>
            </div>
            <div className="space-y-2">
              <Label className="block">แสดงในระบบขาย</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-red-600"
                  checked={form.show_in_pos}
                  onChange={(e) => update("show_in_pos", e.target.checked)}
                />
                แสดงสินค้านี้ในหน้า POS / สั่งซื้อ
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 8. รูปภาพ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">8. รูปภาพ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="image">URL รูปภาพ</Label>
              <Input
                id="image"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={form.image_url}
                onChange={(e) => update("image_url", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* บันทึก */}
        <div className="flex justify-end gap-2 pb-4">
          <Button
            type="button"
            onClick={() => router.back()}
            className="bg-muted hover:bg-muted/80 text-foreground"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            disabled={submitting}
          >
            {submitting ? "กำลังบันทึก…" : "บันทึกสินค้า"}
          </Button>
        </div>
      </form>
    </div>
  );
}
