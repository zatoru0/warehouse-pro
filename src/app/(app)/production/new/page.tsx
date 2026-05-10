"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_OPTIONS = [
  { value: "ASSEMBLY",    label: "ประกอบ (Assembly)" },
  { value: "DISASSEMBLY", label: "แยกชิ้นส่วน (Disassembly)" },
  { value: "REPAIR",      label: "ซ่อม (Repair)" },
];

type Warehouse = { id: string; name: string; code: string; type: string };
type Product = { id: string; name: string; sku: string };

export default function NewProductionPage() {
  const router = useRouter();
  const { data: warehousesData } = useSWR("/api/warehouses", fetcher);
  const warehouses: Warehouse[] = Array.isArray(warehousesData) ? warehousesData : [];
  const { data: productsRes } = useSWR("/api/products?limit=200", fetcher);

  const [type, setType] = useState("ASSEMBLY");
  const [productId, setProductId] = useState("");
  const [qtyPlanned, setQtyPlanned] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "URGENT">("NORMAL");
  const [shouldCertify, setShouldCertify] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // เฉพาะคลังประเภท PRODUCTION_REPAIR
  const productionWarehouses = (warehouses ?? []).filter((w) => w.type === "PRODUCTION_REPAIR");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_type:       type,
        product_id:     productId,
        qty_planned:    Number(qtyPlanned),
        warehouse_id:   warehouseId,
        priority,
        should_certify: shouldCertify,
        notes:          notes || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }

    router.push(`/production/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">สร้างงานผลิตใหม่</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">รายละเอียดงานผลิต</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ประเภทงาน */}
            <div className="space-y-2">
              <Label htmlFor="type">ประเภทงาน</Label>
              <select
                id="type"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Assembly = ประกอบสินค้า, Disassembly = แยกชิ้นส่วน, Repair = ซ่อม
              </p>
            </div>

            {/* สินค้าเป้าหมาย */}
            <div className="space-y-2">
              <Label htmlFor="product">สินค้าเป้าหมาย</Label>
              <select
                id="product"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {((productsRes?.products ?? []) as Product[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                เลือกสินค้าที่ต้องการดำเนินการ
              </p>
            </div>

            {/* จำนวนที่ต้องการผลิต */}
            <div className="space-y-2">
              <Label htmlFor="qty">จำนวนที่ต้องการผลิต</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                step="any"
                placeholder="0"
                value={qtyPlanned}
                onChange={(e) => setQtyPlanned(e.target.value)}
                required
              />
            </div>

            {/* คลังผลิต */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">คลังผลิต / ซ่อม</Label>
              <select
                id="warehouse"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {productionWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
              {productionWarehouses.length === 0 && warehouses && (
                <p className="text-xs text-amber-600">
                  ⚠ ยังไม่มีคลังประเภท PRODUCTION_REPAIR
                </p>
              )}
            </div>

            {/* ความเร่งด่วน + ตีตรา (ตาม PDF: รายชิ้น) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ความเร่งด่วน</Label>
                <div className="flex gap-1">
                  {(["LOW", "NORMAL", "URGENT"] as const).map((p) => {
                    const labels = { LOW: "ทั่วไป", NORMAL: "ปกติ", URGENT: "ด่วนมาก" };
                    const colors = {
                      LOW:    priority === "LOW"    ? "bg-blue-500/10 text-blue-600 border-blue-500"   : "border-border",
                      NORMAL: priority === "NORMAL" ? "bg-green-500/10 text-green-600 border-green-500" : "border-border",
                      URGENT: priority === "URGENT" ? "bg-red-500/10 text-red-600 border-red-500"       : "border-border",
                    };
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors ${colors[p]}`}
                      >
                        {p === "URGENT" && "🚨 "}{labels[p]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>ตีตรา</Label>
                <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-border px-3 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-red-600"
                    checked={shouldCertify}
                    onChange={(e) => setShouldCertify(e.target.checked)}
                  />
                  <span className="text-sm">ต้องตีตราหลังตรวจ QC</span>
                </label>
              </div>
            </div>

            {/* หมายเหตุ */}
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={submitting}
              >
                {submitting ? "กำลังสร้าง…" : "สร้างงานผลิต"}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-muted hover:bg-muted/80 text-foreground"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
